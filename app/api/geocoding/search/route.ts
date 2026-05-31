import { NextResponse, type NextRequest } from 'next/server';
import { buscarLugares } from '@/lib/services/geocoding';
import { handleApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/geocoding/search?q=<query>
 *
 * Proxy a Nominatim. Lo hacemos server-side para:
 *   - Adjuntar el User-Agent obligatorio.
 *   - Caché y rate-limit centralizados (futuro).
 *   - No exponer el User-Agent al cliente.
 *
 * Sirve a US-11.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    if (q.trim().length < 2) {
      return NextResponse.json({ data: [] });
    }
    const results = await buscarLugares(q, 6);
    return NextResponse.json({ data: results });
  } catch (err) {
    return handleApiError(err);
  }
}
