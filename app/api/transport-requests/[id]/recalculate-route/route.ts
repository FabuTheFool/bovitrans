import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { handleApiError, notFound } from '@/lib/api/errors';
import { calcularRuta } from '@/lib/services/routing';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transport-requests/:id/recalculate-route
 *
 * Re-consulta OSRM y actualiza distancia + tiempo. Útil cuando la primera
 * creación no logró calcular la ruta (servicio caído).
 *
 * Implementa US-12 (escenario 2).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);

    const cur = await query<{
      origen_lat: number;
      origen_lon: number;
      destino_lat: number;
      destino_lon: number;
    }>(
      `SELECT origen_lat::float, origen_lon::float,
              destino_lat::float, destino_lon::float
         FROM solicitudes WHERE id = $1`,
      [id],
    );
    if (cur.rowCount === 0) throw notFound(`No existe la solicitud ${id}.`);
    const s = cur.rows[0];

    const ruta = await calcularRuta(
      { lat: s.origen_lat, lon: s.origen_lon },
      { lat: s.destino_lat, lon: s.destino_lon },
    );

    await query(
      `UPDATE solicitudes
          SET distancia_km = $1, tiempo_estimado_min = $2
        WHERE id = $3`,
      [ruta.distancia_km, ruta.tiempo_estimado_min, id],
    );

    return NextResponse.json({
      data: {
        distancia_km: ruta.distancia_km,
        tiempo_estimado_min: ruta.tiempo_estimado_min,
        is_approximate: ruta.is_approximate,
      },
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
