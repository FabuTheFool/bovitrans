import { NextResponse, type NextRequest } from 'next/server';
import { query, withTransaction } from '@/lib/db/client';
import { handleApiError, notFound, businessRule } from '@/lib/api/errors';
import { SolicitudPatchSchema } from '@/lib/validators/transport-request';
import { calcularRuta } from '@/lib/services/routing';

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

/**
 * PATCH /api/transport-requests/:id
 *
 * Edita una solicitud. Sólo permitido en estado 'pendiente' (una vez asignada
 * o iniciada, los datos quedan "comprometidos" — para modificarlos hay que
 * liberar/cancelar primero).
 *
 * Si origen o destino cambian, se recalcula la ruta automáticamente.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const body = SolicitudPatchSchema.parse(await req.json());

    return await withTransaction(async (client) => {
      const cur = await client.query<{
        estado: string;
        origen_lat: number;
        origen_lon: number;
        destino_lat: number;
        destino_lon: number;
      }>(
        `SELECT estado::text AS estado,
                origen_lat::float AS origen_lat, origen_lon::float AS origen_lon,
                destino_lat::float AS destino_lat, destino_lon::float AS destino_lon
           FROM solicitudes WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (cur.rowCount === 0) throw notFound(`No existe la solicitud ${id}.`);
      if (cur.rows[0].estado !== 'pendiente') {
        throw businessRule(
          `Sólo se puede editar una solicitud en estado "pendiente". Estado actual: "${cur.rows[0].estado}".`,
        );
      }

      // Detectar si las coordenadas cambiaron (siempre vienen ambas o ninguna por refine del schema)
      const coordsChanged =
        body.origen != null &&
        body.destino != null &&
        (body.origen.lat !== cur.rows[0].origen_lat ||
         body.origen.lon !== cur.rows[0].origen_lon ||
         body.destino.lat !== cur.rows[0].destino_lat ||
         body.destino.lon !== cur.rows[0].destino_lon);

      // Recalcular ruta sólo si las coords cambiaron
      let distanciaKm: number | undefined;
      let tiempoMin: number | undefined;
      if (coordsChanged && body.origen && body.destino) {
        const ruta = await calcularRuta(
          { lat: body.origen.lat, lon: body.origen.lon },
          { lat: body.destino.lat, lon: body.destino.lon },
        );
        distanciaKm = ruta.distancia_km;
        tiempoMin = ruta.tiempo_estimado_min;
      }

      // Build dinámico del UPDATE con sólo los campos provistos
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown) => {
        vals.push(val);
        sets.push(`${col} = $${vals.length}`);
      };

      if (body.solicitante_nombre !== undefined)   push('solicitante_nombre',   body.solicitante_nombre);
      if (body.solicitante_contacto !== undefined) push('solicitante_contacto', body.solicitante_contacto);
      if (body.cabezas !== undefined)              push('cabezas',              body.cabezas);
      if (body.origen) {
        push('origen_lat',   body.origen.lat);
        push('origen_lon',   body.origen.lon);
        push('origen_label', body.origen.label);
      }
      if (body.destino) {
        push('destino_lat',   body.destino.lat);
        push('destino_lon',   body.destino.lon);
        push('destino_label', body.destino.label);
      }
      if (distanciaKm !== undefined) {
        push('distancia_km',         distanciaKm);
        push('tiempo_estimado_min',  tiempoMin ?? null);
      }

      if (sets.length === 0) {
        // Nada que actualizar
        return NextResponse.json({ data: { id, updated: false } });
      }

      vals.push(id);
      const result = await client.query<{ id: number }>(
        `UPDATE solicitudes SET ${sets.join(', ')}
          WHERE id = $${vals.length}
          RETURNING id`,
        vals,
      );

      return NextResponse.json({
        data: {
          id: result.rows[0].id,
          updated: true,
          route_recalculated: coordsChanged,
        },
      });
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
