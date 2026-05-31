import { NextResponse, type NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { SolicitudCancelSchema } from '@/lib/validators/transport-request';
import {
  handleApiError,
  notFound,
  businessRule,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transport-requests/:id/cancel
 *
 * Cancela una solicitud. Si tiene una asignación activa, la libera en la
 * misma transacción.
 *
 * Implementa US-04.
 *
 * Reglas: no se permite cancelar 'completada' ni 'cancelada' (idempotencia
 * negativa explícita).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const body = SolicitudCancelSchema.parse(await req.json().catch(() => ({})));

    return await withTransaction(async (client) => {
      const cur = await client.query<{ estado: string }>(
        `SELECT estado::text AS estado FROM solicitudes WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (cur.rowCount === 0) {
        throw notFound(`No existe la solicitud ${id}.`);
      }
      const estado = cur.rows[0].estado;
      if (estado === 'completada' || estado === 'cancelada') {
        throw businessRule(
          `No se puede cancelar una solicitud en estado "${estado}".`,
        );
      }

      // Liberar asignación activa si existe.
      await client.query(
        `UPDATE asignaciones
            SET estado = 'liberada', closed_at = NOW()
          WHERE solicitud_id = $1 AND estado = 'activa'`,
        [id],
      );

      await client.query(
        `UPDATE solicitudes
            SET estado = 'cancelada',
                cancelada_at = NOW(),
                motivo_cancelacion = $2
          WHERE id = $1`,
        [id, body.motivo ?? null],
      );

      return new NextResponse(null, { status: 204 });
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function parseId(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw notFound('Id de solicitud inválido.');
  return n;
}
