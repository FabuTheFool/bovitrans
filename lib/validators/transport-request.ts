import { z } from 'zod';

/**
 * Schemas Zod para Solicitudes de Transporte (US-01..US-05).
 *
 * Invariantes: INV-05 (cabezas >= 1).
 * Regla de UX: origen != destino se valida en `refine`.
 */

export const SolicitudEstadoSchema = z.enum([
  'pendiente',
  'asignada',
  'en_curso',
  'completada',
  'cancelada',
]);
export type SolicitudEstado = z.infer<typeof SolicitudEstadoSchema>;

const LatSchema = z
  .number({ invalid_type_error: 'Latitud debe ser un número.' })
  .min(-90, 'Latitud fuera de rango.')
  .max(90, 'Latitud fuera de rango.');

const LonSchema = z
  .number({ invalid_type_error: 'Longitud debe ser un número.' })
  .min(-180, 'Longitud fuera de rango.')
  .max(180, 'Longitud fuera de rango.');

export const PuntoGeograficoSchema = z.object({
  lat: LatSchema,
  lon: LonSchema,
  label: z.string().trim().min(1, 'El nombre del punto no puede estar vacío.').max(200),
});
export type PuntoGeografico = z.infer<typeof PuntoGeograficoSchema>;

export const SolicitudCreateSchema = z
  .object({
    solicitante_nombre: z.string().trim().min(1).max(200),
    solicitante_contacto: z.string().trim().max(100).optional().nullable(),
    cabezas: z.number().int().min(1, 'Debe haber al menos 1 cabeza.').max(10_000),
    origen: PuntoGeograficoSchema,
    destino: PuntoGeograficoSchema,
  })
  .refine(
    (data) =>
      !(
        data.origen.lat === data.destino.lat &&
        data.origen.lon === data.destino.lon
      ),
    {
      message: 'El origen y el destino no pueden coincidir.',
      path: ['destino'],
    },
  );
export type SolicitudCreate = z.infer<typeof SolicitudCreateSchema>;

export const SolicitudCancelSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

/**
 * DTO de solicitud para el dashboard.
 *
 * Espeja la forma plana que devuelve la vista `v_solicitudes_dashboard`:
 * todos los campos `asignacion_*` y `camion_*` son nullable y arrancan en
 * NULL cuando la solicitud no tiene asignación activa.
 *
 * Decisión: schema PLANO en lugar de objeto anidado porque (a) matchea la
 * SQL real (LEFT JOIN denormalizado), (b) evita re-mapping innecesario en
 * cada handler, y (c) Zod puede validar el output real sin transformaciones.
 */
export const SolicitudDTOSchema = z.object({
  id: z.number().int().positive(),
  solicitante_nombre: z.string(),
  solicitante_contacto: z.string().nullable(),
  cabezas: z.number().int(),
  origen_lat: z.number(),
  origen_lon: z.number(),
  origen_label: z.string(),
  destino_lat: z.number(),
  destino_lon: z.number(),
  destino_label: z.string(),
  distancia_km: z.number().nullable(),
  tiempo_estimado_min: z.number().int().nullable(),
  estado: SolicitudEstadoSchema,
  created_at: z.string(),

  // Campos de la asignación activa (planos, todos coherentemente null si no hay).
  asignacion_id: z.number().int().positive().nullable(),
  costo_combustible: z.number().nullable(),
  con_sobrecapacidad: z.boolean().nullable(),
  camion_id: z.number().int().positive().nullable(),
  camion_patente: z.string().nullable(),
  camion_capacidad: z.number().int().nullable(),
});
export type SolicitudDTO = z.infer<typeof SolicitudDTOSchema>;
