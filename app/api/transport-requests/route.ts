import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import {
  SolicitudCreateSchema,
  SolicitudEstadoSchema,
} from '@/lib/validators/transport-request';
import { handleApiError } from '@/lib/api/errors';
import { calcularRuta } from '@/lib/services/routing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transport-requests
 *
 * Listado del dashboard, usa la vista v_solicitudes_dashboard
 * (incluye datos del camión asignado cuando hay asignación activa).
 *
 * Query params:
 *   - estado: filtro por estado (opcional)
 *
 * Implementa US-01.
 */
export async function GET(req: NextRequest) {
  try {
    const estadoRaw = req.nextUrl.searchParams.get('estado');
    const params: unknown[] = [];
    let where = '';
    if (estadoRaw) {
      const estado = SolicitudEstadoSchema.parse(estadoRaw);
      params.push(estado);
      where = `WHERE estado = $1::solicitud_estado`;
    }

    const result = await query(
      `SELECT id, solicitante_nombre, solicitante_contacto, cabezas,
              origen_lat::float AS origen_lat, origen_lon::float AS origen_lon, origen_label,
              destino_lat::float AS destino_lat, destino_lon::float AS destino_lon, destino_label,
              distancia_km::float AS distancia_km, tiempo_estimado_min,
              estado::text AS estado, created_at::text AS created_at,
              asignacion_id, costo_combustible::float AS costo_combustible,
              con_sobrecapacidad,
              camion_id, camion_patente, camion_capacidad
         FROM v_solicitudes_dashboard
         ${where}
         ORDER BY
            CASE estado
              WHEN 'pendiente' THEN 0
              WHEN 'asignada'  THEN 1
              WHEN 'en_curso'  THEN 2
              WHEN 'completada' THEN 3
              WHEN 'cancelada' THEN 4
            END,
            created_at DESC`,
      params,
    );

    return NextResponse.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/transport-requests
 *
 * Crea una solicitud. Llama a `calcularRuta` que SIEMPRE devuelve un resultado
 * (OSRM si disponible, sino haversine × 1.3 como fallback). Por eso
 * distancia_km nunca queda NULL y la asignación no se bloquea.
 *
 * Header X-Routing-Status: 'ok' (OSRM real) | 'approximate' (haversine).
 *
 * Implementa US-02. Cubre BR-03 y el escenario 4 de fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const body = SolicitudCreateSchema.parse(await req.json());

    const ruta = await calcularRuta(
      { lat: body.origen.lat, lon: body.origen.lon },
      { lat: body.destino.lat, lon: body.destino.lon },
    );

    const result = await query(
      `INSERT INTO solicitudes (
          solicitante_nombre, solicitante_contacto, cabezas,
          origen_lat, origen_lon, origen_label,
          destino_lat, destino_lon, destino_label,
          distancia_km, tiempo_estimado_min
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, solicitante_nombre, solicitante_contacto, cabezas,
                 origen_lat::float, origen_lon::float, origen_label,
                 destino_lat::float, destino_lon::float, destino_label,
                 distancia_km::float, tiempo_estimado_min,
                 estado::text AS estado, created_at::text`,
      [
        body.solicitante_nombre,
        body.solicitante_contacto ?? null,
        body.cabezas,
        body.origen.lat,
        body.origen.lon,
        body.origen.label,
        body.destino.lat,
        body.destino.lon,
        body.destino.label,
        ruta.distancia_km,
        ruta.tiempo_estimado_min,
      ],
    );

    return NextResponse.json(
      { data: result.rows[0] },
      {
        status: 201,
        headers: {
          'X-Routing-Status': ruta.is_approximate ? 'approximate' : 'ok',
        },
      },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
