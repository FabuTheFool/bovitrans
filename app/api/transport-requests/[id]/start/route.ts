import { NextResponse, type NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import { handleApiError, notFound, businessRule } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transport-requests/:id/start
 *
 * Transición: asignada → en_curso.
 * Sólo válida si la solicitud está actualmente en estado 'asignada'.
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
      if (cur.rows[0].estado !== 'asignada') {
        throw businessRule(
          `Sólo se puede iniciar una solicitud en estado "asignada". Estado actual: "${cur.rows[0].estado}".`,
        );
      }

      await client.query(
        `UPDATE solicitudes SET estado = 'en_curso' WHERE id = $1`,
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
