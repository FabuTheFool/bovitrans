import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '@/lib/db/client';
import { handleApiError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

const BulkSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  action: z.enum(['start', 'complete', 'cancel']),
  motivo: z.string().trim().max(500).optional(),
});

/**
 * POST /api/transport-requests/bulk-transition
 *
 * Aplica una transición a varias solicitudes en una sola transacción.
 * Sólo ejecuta sobre las solicitudes que están en el estado fuente válido;
 * el resto se devuelven en `rejected` con el motivo.
 *
 * Acciones:
 *   - start    : asignada → en_curso
 *   - complete : en_curso → completada (cierra asignación)
 *   - cancel   : cualquiera != (completada|cancelada) → cancelada
 */
export async function POST(req: NextRequest) {
  try {
    const body = BulkSchema.parse(await req.json());

    return await withTransaction(async (client) => {
      const allowedSource = body.action === 'start'
        ? ['asignada']
        : body.action === 'complete'
          ? ['en_curso']
          : ['pendiente', 'asignada', 'en_curso']; // cancel

      // Lock las solicitudes solicitadas (orden estable para evitar deadlocks)
      const cur = await client.query<{ id: number; estado: string }>(
        `SELECT id, estado::text AS estado
           FROM solicitudes
          WHERE id = ANY($1::bigint[])
          ORDER BY id
            FOR UPDATE`,
        [body.ids],
      );

      const found = new Map(cur.rows.map((r) => [r.id, r.estado]));
      const accepted: number[] = [];
      const rejected: { id: number; reason: string }[] = [];

      for (const id of body.ids) {
        const estado = found.get(id);
        if (!estado) { rejected.push({ id, reason: 'no_encontrada' }); continue; }
        if (!allowedSource.includes(estado)) {
          rejected.push({ id, reason: `estado_invalido:${estado}` });
          continue;
        }
        accepted.push(id);
      }

      if (accepted.length === 0) {
        return NextResponse.json({ data: { accepted: [], rejected }, action: body.action });
      }

      // Aplicar transición
      if (body.action === 'start') {
        await client.query(
          `UPDATE solicitudes SET estado = 'en_curso' WHERE id = ANY($1::bigint[])`,
          [accepted],
        );
      } else if (body.action === 'complete') {
        await client.query(
          `UPDATE solicitudes SET estado = 'completada' WHERE id = ANY($1::bigint[])`,
          [accepted],
        );
        await client.query(
          `UPDATE asignaciones
              SET estado = 'completada', closed_at = NOW()
            WHERE solicitud_id = ANY($1::bigint[]) AND estado = 'activa'`,
          [accepted],
        );
      } else { // cancel
        // Liberar asignaciones activas primero
        await client.query(
          `UPDATE asignaciones
              SET estado = 'liberada', closed_at = NOW()
            WHERE solicitud_id = ANY($1::bigint[]) AND estado = 'activa'`,
          [accepted],
        );
        await client.query(
          `UPDATE solicitudes
              SET estado = 'cancelada', cancelada_at = NOW(),
                  motivo_cancelacion = $2
            WHERE id = ANY($1::bigint[])`,
          [accepted, body.motivo ?? null],
        );
      }

      return NextResponse.json({
        data: { accepted, rejected },
        action: body.action,
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) return handleApiError(validationError('Body inválido.', err.flatten()));
    return handleApiError(err);
  }
}
