import type { PoolClient } from 'pg';
import { query } from '@/lib/db/client';
import { FuelPriceSchema, type FuelPrice } from '@/lib/validators/settings';

const FUEL_PRICE_KEY = 'fuel_price_per_liter';

export async function getFuelPrice(client?: PoolClient): Promise<FuelPrice> {
  const q = `SELECT valor FROM parametros WHERE clave = $1`;
  const result = client
    ? await client.query<{ valor: unknown }>(q, [FUEL_PRICE_KEY])
    : await query<{ valor: unknown }>(q, [FUEL_PRICE_KEY]);
  if (result.rowCount === 0) {
    throw new Error('Parámetro fuel_price_per_liter no encontrado.');
  }
  return FuelPriceSchema.parse(result.rows[0].valor);
}

export async function setFuelPrice(newAmount: number): Promise<FuelPrice> {
  const current = await getFuelPrice();
  const newValue: FuelPrice = { amount: newAmount, currency: current.currency };
  await query(
    `UPDATE parametros SET valor = $1 WHERE clave = $2`,
    [JSON.stringify(newValue), FUEL_PRICE_KEY],
  );
  return newValue;
}

export interface FuelPriceHistoryEntry {
  id: number;
  valor_anterior: FuelPrice | null;
  valor_nuevo: FuelPrice;
  changed_at: string;
}

export async function getFuelPriceHistory(): Promise<FuelPriceHistoryEntry[]> {
  const result = await query<{
    id: number;
    valor_anterior: FuelPrice | null;
    valor_nuevo: FuelPrice;
    changed_at: Date;
  }>(
    `SELECT id, valor_anterior, valor_nuevo, changed_at
       FROM parametros_historial
      WHERE clave = $1
      ORDER BY changed_at DESC
      LIMIT 100`,
    [FUEL_PRICE_KEY],
  );
  return result.rows.map((r) => ({
    id: r.id,
    valor_anterior: r.valor_anterior,
    valor_nuevo: r.valor_nuevo,
    changed_at: r.changed_at.toISOString(),
  }));
}
