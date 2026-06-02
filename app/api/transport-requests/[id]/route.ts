import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { handleApiError, notFound } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transport-requests/:id
 *
 * Detalle de una solicitud, incluyendo la asignación activa (si tiene) y
 * los datos del camión asignado.
 *
 * Implementa US-03.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const result = await query(
      `SELECT id, solicitante_nombre, solicitante_contacto, cabezas,
              origen_lat::float, origen_lon::float, origen_label,
              destino_lat::float, destino_lon::float, destino_label,
              distancia_km::float, tiempo_estimado_min,
              estado::text AS estado, created_at::text,
              asignacion_id, costo_combustible::float, con_sobrecapacidad,
              camion_id, camion_patente, camion_capacidad
         FROM v_solicitudes_dashboard
        WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) {
      throw notFound(`No existe la solicitud ${id}.`);
    }
    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}

function parseId(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) throw notFound('Id de solicitud inválido.');
  return n;
}
