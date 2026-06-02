import { NextResponse, type NextRequest } from 'next/server';
import { query, withTransaction } from '@/lib/db/client';
import { CamionUpdateSchema, type CamionDTO } from '@/lib/validators/truck';
import { handleApiError, notFound, businessRule } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trucks/:id
 *
 * Detalle de un camión + métricas agregadas + histórico de asignaciones.
 * Implementa US-09.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);

    const camion = await query<CamionDTO>(
      `SELECT id, patente, patente_normalizada, capacidad_max,
              consumo_l_km::float AS consumo_l_km, estado,
              created_at::text, updated_at::text
         FROM camiones WHERE id = $1`,
      [id],
    );
    if (camion.rowCount === 0) {
      throw notFound(`No existe el camión ${id}.`);
    }

    const historico = await query<{
      id: number;
      solicitud_id: number;
      solicitante_nombre: string;
      cabezas_aplicadas: number;
      distancia_km_aplicada: number;
      costo_combustible: number;
      estado: string;
      con_sobrecapacidad: boolean;
      created_at: string;
    }>(
      `SELECT a.id, a.solicitud_id, s.solicitante_nombre,
              a.cabezas_aplicadas,
              a.distancia_km_aplicada::float AS distancia_km_aplicada,
              a.costo_combustible::float AS costo_combustible,
              a.estado::text AS estado,
              a.con_sobrecapacidad,
              a.created_at::text
         FROM asignaciones a
         JOIN solicitudes s ON s.id = a.solicitud_id
        WHERE a.camion_id = $1
        ORDER BY a.created_at DESC
        LIMIT 200`,
      [id],
    );

    const agregados = await query<{
      total_km: number | null;
      total_litros: number | null;
      total_costo: number | null;
      total_viajes: number;
    }>(
      `SELECT COALESCE(SUM(distancia_km_aplicada), 0)::float        AS total_km,
              COALESCE(SUM(distancia_km_aplicada * consumo_aplicado), 0)::float
                                                                    AS total_litros,
              COALESCE(SUM(costo_combustible), 0)::float            AS total_costo,
              COUNT(*)::int                                         AS total_viajes
         FROM asignaciones
        WHERE camion_id = $1`,
      [id],
    );

    return NextResponse.json({
      data: {
        ...camion.rows[0],
        historico_asignaciones: historico.rows,
        agregados: agregados.rows[0],
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/trucks/:id
 *
 * Sólo permite cambiar `estado`. La invariante INV-01 también está
 * protegida por trigger en la DB.
 *
 * Reglas de negocio adicionales:
 *   - No se puede inactivar un camión con asignaciones 'activa' (US-08 escenario 2).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params.id);
    const body = CamionUpdateSchema.parse(await req.json());

    return await withTransaction(async (client) => {
      const exists = await client.query(`SELECT 1 FROM camiones WHERE id = $1`, [id]);
      if (exists.rowCount === 0) {
        throw notFound(`No existe el camión ${id}.`);
      }

      if (body.estado === 'inactivo') {
        const asignActivas = await client.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count
             FROM asignaciones WHERE camion_id = $1 AND estado = 'activa'`,
          [id],
        );
        if ((asignActivas.rows[0]?.count ?? 0) > 0) {
          throw businessRule(
            'El camión tiene una asignación activa. Liberala antes de darlo de baja.',
          );
        }
      }

      const result = await client.query<CamionDTO>(
        `UPDATE camiones SET estado = $1 WHERE id = $2
         RETURNING id, patente, patente_normalizada, capacidad_max,
                   consumo_l_km::float AS consumo_l_km, estado,
                   created_at::text, updated_at::text`,
        [body.estado, id],
      );
      return NextResponse.json({ data: result.rows[0] });
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function parseId(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw notFound('Id de camión inválido.');
  }
  return n;
}
