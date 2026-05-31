/**
 * Cliente para Nominatim (OSM geocoding).
 *
 * Política de uso de Nominatim público: User-Agent obligatorio, 1 req/s máx.
 * En producción real, hostear propio o usar un proveedor con SLA.
 */

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

export async function buscarLugares(
  q: string,
  limit = 5,
): Promise<GeocodeResult[]> {
  if (!q.trim()) return [];
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '0');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BoviTrans/0.1 (MVP)' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const items = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    return items.map((it) => ({
      lat: Number.parseFloat(it.lat),
      lon: Number.parseFloat(it.lon),
      label: it.display_name,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '14');
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BoviTrans/0.1 (MVP)' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
