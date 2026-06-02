import { NextResponse } from 'next/server';
import { getFuelPriceHistory } from '@/lib/repositories/settings';
import { handleApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/** GET /api/settings/fuel-price/history — historial de cambios. Implementa US-18. */
export async function GET() {
  try {
    const history = await getFuelPriceHistory();
    return NextResponse.json({ data: history });
  } catch (err) {
    return handleApiError(err);
  }
}
