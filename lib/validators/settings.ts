import { z } from 'zod';

export const FuelPriceSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'El precio debe ser un número.' })
    .positive('El precio debe ser mayor a 0.')
    .max(100_000, 'Precio fuera de rango razonable.'),
  currency: z.string().length(3).default('PYG'),
});
export type FuelPrice = z.infer<typeof FuelPriceSchema>;

export const FuelPriceUpdateSchema = z.object({
  amount: z.number().positive('El precio debe ser mayor a 0.'),
});
