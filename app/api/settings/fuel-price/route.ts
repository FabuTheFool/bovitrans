import { NextResponse, type NextRequest } from 'next/server';
import { FuelPriceUpdateSchema } from '@/lib/validators/settings';
import { getFuelPrice, setFuelPrice } from '@/lib/repositories/settings';
import { handleApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/** GET /api/settings/fuel-price — precio actual. */
export async function GET() {
  try {
    const price = await getFuelPrice();
    return NextResponse.json({ data: price });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/settings/fuel-price
 *
 * Actualiza el precio. El historial se genera automáticamente vía trigger
 * en la DB (no requiere lógica de aplicación).
 *
 * Implementa US-17.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = FuelPriceUpdateSchema.parse(await req.json());
    const updated = await setFuelPrice(body.amount);
    return NextResponse.json({ data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
