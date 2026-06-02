import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Envelope estándar de error de la API:
 *   { error: { code, message, details? } }
 *
 * Códigos HTTP usados:
 *   400 — validación de input (Zod)
 *   404 — recurso no existe
 *   409 — violación de invariante (ej. patente duplicada)
 *   422 — regla de negocio rechaza la operación (ej. camión inactivo)
 *   500 — error no manejado
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(message: string, details?: unknown): ApiError {
  return new ApiError('NOT_FOUND', 404, message, details);
}

export function unauthorized(message = 'No autenticado.', details?: unknown): ApiError {
  return new ApiError('UNAUTHORIZED', 401, message, details);
}

export function forbidden(message: string, details?: unknown): ApiError {
  return new ApiError('FORBIDDEN', 403, message, details);
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError('CONFLICT', 409, message, details);
}

export function businessRule(message: string, details?: unknown): ApiError {
  return new ApiError('BUSINESS_RULE', 422, message, details);
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError('VALIDATION_ERROR', 400, message, details);
}

/**
 * Wrap a route handler para que sus throws se conviertan en respuestas
 * JSON consistentes. No oculta detalles en errores 500 en desarrollo;
 * en producción, sanitiza.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validación fallida.',
          details: err.flatten(),
        },
      },
      { status: 400 },
    );
  }

  // Errores de Postgres que mapeamos a códigos HTTP semánticos.
  // En prod NO se expone constraint name ni mensaje crudo de pg (info disclosure).
  const isProd = process.env.NODE_ENV === 'production';
  const pgErr = err as { code?: string; message?: string; constraint?: string };
  if (typeof pgErr.code === 'string') {
    if (pgErr.code === '23505') {
      // unique_violation
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Violación de unicidad.',
            details: isProd
              ? undefined
              : { constraint: pgErr.constraint, hint: pgErr.message },
          },
        },
        { status: 409 },
      );
    }
    if (pgErr.code === '23514') {
      // check_violation (triggers de inmutabilidad caen acá)
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_RULE',
            message: isProd
              ? 'Violación de regla de negocio.'
              : (pgErr.message ?? 'Violación de regla de negocio.'),
            details: isProd ? undefined : { constraint: pgErr.constraint },
          },
        },
        { status: 422 },
      );
    }
  }

  console.error('[api] error no manejado:', err);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor.'
      : err instanceof Error
        ? err.message
        : String(err);

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 },
  );
}
