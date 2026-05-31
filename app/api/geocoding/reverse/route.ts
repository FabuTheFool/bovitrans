import { NextResponse, type NextRequest } from 'next/server';
import { reverseGeocode } from '@/lib/services/geocoding';
import { handleApiError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/** GET /api/geocoding/reverse?lat=...&lon=... */
export async function GET(req: NextRequest) {
  try {
    const lat = Number(req.nextUrl.searchParams.get('lat'));
    const lon = Number(req.nextUrl.searchParams.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw validationError('lat y lon son obligatorios y numéricos.');
    }
    const label = await reverseGeocode(lat, lon);
    return NextResponse.json({ data: { label } });
  } catch (err) {
    return handleApiError(err);
  }
}
