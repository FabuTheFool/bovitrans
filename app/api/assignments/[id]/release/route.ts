import { NextResponse, type NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import {
  handleApiError,
  notFound,
  businessRule,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assignments/:id/release
 *
 * Libera una asignación activa: pasa a estado 'liberada' y devuelve la
 * solicitud a 'pendiente'. El camión queda libre para nuevas asignaciones.
 *
 * Implementa US-16 (escenario 1).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);

    return await withTransaction(async (client) => {
      const cur = await client.query<{
        id: number;
        solicitud_id: number;
        estado: string;
      }>(
        `SELECT id, solicitud_id, estado::text AS estado
           FROM asignaciones WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (cur.rowCount === 0) {
        throw notFound(`No existe la asignación ${id}.`);
      }
      if (cur.rows[0].estado !== 'activa') {
        throw businessRule(
          `No se puede liberar una asignación en estado "${cur.rows[0].estado}".`,
        );
      }

      await client.query(
        `UPDATE asignaciones
            SET estado = 'liberada', closed_at = NOW()
          WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE solicitudes SET estado = 'pendiente' WHERE id = $1`,
        [cur.rows[0].solicitud_id],
      );

      return new NextResponse(null, { status: 204 });
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function parseId(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw notFound('Id de asignación inválido.');
  return n;
}
