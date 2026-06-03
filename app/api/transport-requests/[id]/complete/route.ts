import { NextResponse, type NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { handleApiError, notFound, businessRule } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transport-requests/:id/complete
 *
 * Transición: en_curso → completada. En la misma transacción cierra la
 * asignación activa asociada (estado='completada', closed_at=NOW()).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);

    return await withTransaction(async (client) => {
      const cur = await client.query<{ estado: string }>(
        `SELECT estado::text AS estado FROM solicitudes WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (cur.rowCount === 0) throw notFound(`No existe la solicitud ${id}.`);
      if (cur.rows[0].estado !== 'en_curso') {
        throw businessRule(
          `Sólo se puede completar una solicitud en estado "en_curso". Estado actual: "${cur.rows[0].estado}".`,
        );
      }

      await client.query(
        `UPDATE solicitudes SET estado = 'completada' WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE asignaciones
            SET estado = 'completada', closed_at = NOW()
          WHERE solicitud_id = $1 AND estado = 'activa'`,
        [id],
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
