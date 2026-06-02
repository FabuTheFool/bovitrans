/**
 * Wrapper minimalista de fetch para llamadas a la API interna.
 *
 * - Lanza `ApiClientError` con `code` y `details` para que la UI pueda
 *   distinguir conflict de business_rule de validation, sin parsear texto.
 * - Manejo uniforme de 204 (No Content) y respuestas JSON.
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface ApiResponse<T> {
  data: T;
  [key: string]: unknown;
}

async function apiCall<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiClientError(
      'NETWORK_ERROR',
      0,
      err instanceof Error ? err.message : 'Error de red.',
    );
  }

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => ({}))) as Partial<{
    data: T;
    error: { code: ApiErrorCode; message: string; details?: unknown };
  }>;

  if (!res.ok) {
    // 401 fuera de las rutas de auth → la sesión expiró durante el uso.
    // Redirigir a /login conservando la URL actual como ?next=. Solo en cliente.
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !input.startsWith('/api/auth/')
    ) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?next=${next}`);
    }
    const e = json.error ?? { code: 'INTERNAL_ERROR' as const, message: 'Error desconocido.' };
    throw new ApiClientError(e.code, res.status, e.message, e.details);
  }
  return (json.data ?? (json as unknown as T)) as T;
}

export const api = {
  get:  <T>(url: string)             => apiCall<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    apiCall<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put:  <T>(url: string, body: unknown) =>
    apiCall<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    apiCall<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
};
