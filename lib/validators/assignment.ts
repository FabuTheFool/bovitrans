import { z } from 'zod';

export const AsignacionEstadoSchema = z.enum(['activa', 'liberada', 'completada']);
export type AsignacionEstado = z.infer<typeof AsignacionEstadoSchema>;

export const AsignacionCreateSchema = z.object({
  solicitud_id: z.number().int().positive(),
  camion_id: z.number().int().positive(),
  /** Confirmación explícita de aceptar sobrecapacidad (US-15 escenario 2). */
  acepta_sobrecapacidad: z.boolean().optional().default(false),
});
export type AsignacionCreate = z.infer<typeof AsignacionCreateSchema>;

export const AsignacionReplaceSchema = z.object({
  camion_id: z.number().int().positive(),
  acepta_sobrecapacidad: z.boolean().optional().default(false),
});

export const AsignacionDTOSchema = z.object({
  id: z.number().int().positive(),
  solicitud_id: z.number().int().positive(),
  camion_id: z.number().int().positive(),
  cabezas_aplicadas: z.number().int(),
  distancia_km_aplicada: z.number(),
  consumo_aplicado: z.number(),
  precio_litro_aplicado: z.number(),
  costo_combustible: z.number(),
  con_sobrecapacidad: z.boolean(),
  estado: AsignacionEstadoSchema,
  created_at: z.string(),
  closed_at: z.string().nullable(),
});
export type AsignacionDTO = z.infer<typeof AsignacionDTOSchema>;
