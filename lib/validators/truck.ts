import { z } from 'zod';

/**
 * Schemas Zod para Camiones (US-06, US-07, US-08, US-09).
 *
 * Espejan las invariantes INV-01, INV-02, INV-05 del skill.
 * Se usan tanto en el cliente (form validation en vivo) como en el
 * servidor (boundary de API).
 */

export const CamionEstadoSchema = z.enum(['activo', 'inactivo']);
export type CamionEstado = z.infer<typeof CamionEstadoSchema>;

/** Schema de creación. Sin id ni timestamps. */
export const CamionCreateSchema = z.object({
  patente: z
    .string()
    .trim()
    .min(1, 'La patente no puede estar vacía.')
    .max(20, 'La patente excede el largo permitido.'),
  capacidad_max: z
    .number({ invalid_type_error: 'Capacidad debe ser un número.' })
    .int('Capacidad debe ser un entero.')
    .min(1, 'La capacidad debe ser al menos 1 cabeza.'),
  consumo_l_km: z
    .number({ invalid_type_error: 'Consumo debe ser un número.' })
    .positive('El consumo debe ser mayor a 0.')
    .max(10, 'Consumo excede un valor realista (máx 10 L/Km).'),
});
export type CamionCreate = z.infer<typeof CamionCreateSchema>;

/**
 * Schema de actualización: sólo permite cambiar estado (INV-01).
 * Cualquier intento de mandar campos críticos los ignora.
 */
export const CamionUpdateSchema = z.object({
  estado: CamionEstadoSchema,
});
export type CamionUpdate = z.infer<typeof CamionUpdateSchema>;

/** Respuesta del API (lectura). */
export const CamionDTOSchema = z.object({
  id: z.number().int().positive(),
  patente: z.string(),
  patente_normalizada: z.string(),
  capacidad_max: z.number().int(),
  consumo_l_km: z.number(),
  estado: CamionEstadoSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type CamionDTO = z.infer<typeof CamionDTOSchema>;
