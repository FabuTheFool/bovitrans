import { NextResponse, type NextRequest } from 'next/server';
import { withTransaction } from '@/lib/db/client';
import {
  AsignacionCreateSchema,
  type AsignacionDTO,
} from '@/lib/validators/assignment';
import {
  handleApiError,
  notFound,
  conflict,
  businessRule,
} from '@/lib/api/errors';
import { calcularCostoCombustible } from '@/lib/domain/cost';
import { evaluarSobrecapacidad } from '@/lib/domain/capacity';
import { getFuelPrice } from '@/lib/repositories/settings';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assignments
 *
 * Crea una asignación camión ↔ solicitud, calcula el costo de combustible
 * y persiste el snapshot.
 *
 * Implementa US-13, BR-04.
 *
 * Códigos:
 *   201 — Creada
 *   400 — Validación
 *   404 — Solicitud o camión no existe
 *   409 — Solicitud ya asignada / camión ya asignado (INV-03)
 *   422 — Camión inactivo, solicitud en estado no asignable, sobrecapacidad
 *         sin confirmar explícita, distancia no calculada
 */
export async function POST(req: NextRequest) {
  try {
    const body = AsignacionCreateSchema.parse(await req.json());

    return await withTransaction(async (client) => {
      // 1. Cargar solicitud + camión + precio actual del combustible.
      const solicitudRes = await client.query<{
        id: number;
        cabezas: number;
        distancia_km: number | null;
        estado: string;
      }>(
        `SELECT id, cabezas, distancia_km::float AS distancia_km, estado::text AS estado
           FROM solicitudes WHERE id = $1 FOR UPDATE`,
        [body.solicitud_id],
      );
      if (solicitudRes.rowCount === 0) {
        throw notFound(`No existe la solicitud ${body.solicitud_id}.`);
      }
      const solicitud = solicitudRes.rows[0];

      if (solicitud.estado === 'cancelada' || solicitud.estado === 'completada') {
        throw businessRule(
          `No se puede asignar una solicitud en estado "${solicitud.estado}".`,
        );
      }
      if (solicitud.distancia_km == null) {
        throw businessRule(
          'La solicitud no tiene distancia calculada. Recalculá la ruta antes de asignar.',
        );
      }

      const camionRes = await client.query<{
        id: number;
        capacidad_max: number;
        consumo_l_km: number;
        estado: string;
      }>(
        `SELECT id, capacidad_max, consumo_l_km::float AS consumo_l_km,
                estado::text AS estado
           FROM camiones WHERE id = $1 FOR UPDATE`,
        [body.camion_id],
      );
      if (camionRes.rowCount === 0) {
        throw notFound(`No existe el camión ${body.camion_id}.`);
      }
      const camion = camionRes.rows[0];
      if (camion.estado !== 'activo') {
        throw businessRule('El camión está inactivo. No puede recibir asignaciones.');
      }

      // 2. INV-03 fail-fast: chequear estado del recurso ANTES que parámetros
      //    del request. Si la solicitud o el camión ya tienen una asignación
      //    activa, devolver 409 directo en lugar de fallar más tarde con 422
      //    (sobrecapacidad) o esperar al unique parcial del INSERT. Esto da
      //    mensajes más claros y respeta la jerarquía estado > params.
      const existing = await client.query<{ kind: 'solicitud' | 'camion' }>(
        `SELECT 'solicitud'::text AS kind FROM asignaciones
           WHERE solicitud_id = $1 AND estado = 'activa'
         UNION ALL
         SELECT 'camion'::text FROM asignaciones
           WHERE camion_id = $2 AND estado = 'activa'
         LIMIT 1`,
        [body.solicitud_id, body.camion_id],
      );
      if (existing.rowCount && existing.rowCount > 0) {
        if (existing.rows[0].kind === 'solicitud') {
          throw conflict(
            'La solicitud ya tiene un camión asignado. Liberalo antes de reasignar.',
          );
        }
        throw conflict(
          'El camión ya tiene una asignación activa en otra solicitud.',
        );
      }

      // 3. Evaluar sobrecapacidad y exigir confirmación explícita (US-15).
      const capacityEval = evaluarSobrecapacidad(solicitud.cabezas, camion.capacidad_max);
      if (capacityEval.excedida && !body.acepta_sobrecapacidad) {
        throw businessRule(
          `Sobrecapacidad: ${solicitud.cabezas} cabezas exceden la capacidad ${camion.capacidad_max}.`,
          {
            excedente: capacityEval.excedente,
            viajes_necesarios: capacityEval.viajesNecesarios,
            sugerencia:
              'Re-envía con acepta_sobrecapacidad=true para confirmar el riesgo, o seleccioná otro camión.',
          },
        );
      }

      // 4. Snapshot del precio actual del combustible.
      const fuelPrice = await getFuelPrice(client);

      // 5. Cálculo del costo (función pura, testeada).
      const { costoTotal } = calcularCostoCombustible({
        distanciaKm: solicitud.distancia_km,
        consumoLKm: camion.consumo_l_km,
        precioLitro: fuelPrice.amount,
      });

      // 6. Insert. Los unique parciales son la red de seguridad final contra
      //    race conditions: aún con el chequeo previo, dos requests concurrentes
      //    podrían pasar la validación. El unique parcial garantiza que sólo
      //    uno se persista y el otro reciba 23505 → 409 vía handleApiError.
      const asignRes = await client.query<AsignacionDTO>(
        `INSERT INTO asignaciones (
            solicitud_id, camion_id,
            cabezas_aplicadas, distancia_km_aplicada, consumo_aplicado,
            precio_litro_aplicado, costo_combustible, con_sobrecapacidad,
            estado
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activa')
         RETURNING id, solicitud_id, camion_id,
                   cabezas_aplicadas,
                   distancia_km_aplicada::float AS distancia_km_aplicada,
                   consumo_aplicado::float AS consumo_aplicado,
                   precio_litro_aplicado::float AS precio_litro_aplicado,
                   costo_combustible::float AS costo_combustible,
                   con_sobrecapacidad,
                   estado::text AS estado,
                   created_at::text, closed_at::text`,
        [
          body.solicitud_id,
          body.camion_id,
          solicitud.cabezas,
          solicitud.distancia_km,
          camion.consumo_l_km,
          fuelPrice.amount,
          costoTotal,
          capacityEval.excedida,
        ],
      );

      // 6. Solicitud → estado 'asignada'.
      await client.query(
        `UPDATE solicitudes SET estado = 'asignada' WHERE id = $1`,
        [body.solicitud_id],
      );

      return NextResponse.json(
        {
          data: asignRes.rows[0],
          alerta_sobrecapacidad: capacityEval.excedida
            ? {
                excedente: capacityEval.excedente,
                viajes_necesarios: capacityEval.viajesNecesarios,
              }
            : null,
        },
        { status: 201 },
      );
    });
  } catch (err) {
    // Mapear 23505 sobre estos índices a mensaje de dominio claro.
    const pg = err as { code?: string; constraint?: string };
    if (pg?.code === '23505') {
      if (pg.constraint === 'asignaciones_solicitud_activa_uniq') {
        return handleApiError(
          conflict('La solicitud ya tiene un camión asignado. Liberalo antes de reasignar.'),
        );
      }
      if (pg.constraint === 'asignaciones_camion_activa_uniq') {
        return handleApiError(
          conflict('El camión ya tiene una asignación activa en otra solicitud.'),
        );
      }
    }
    return handleApiError(err);
  }
}
