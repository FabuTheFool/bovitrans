/**
 * Cliente para el servicio de routing OSRM.
 * Endpoint público: https://router.project-osrm.org
 *
 * BR-03: usamos rutas terrestres reales, no haversine.
 *
 * Failure mode: si OSRM falla, retornamos null y la app decide qué hacer
 * (persistir solicitud sin distancia, recalcular más tarde, etc.).
 */

export interface RouteResult {
  distancia_km: number;
  tiempo_estimado_min: number;
  geometria: GeoJSON.LineString | null;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';

export async function calcularRuta(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
): Promise<RouteResult | null> {
  const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=simplified&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BoviTrans/0.1 (MVP)' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[routing] OSRM respondió ${res.status} para ${coords}`);
      return null;
    }

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: GeoJSON.LineString;
      }>;
    };

    if (data.code !== 'Ok' || !data.routes?.[0]) {
      console.warn(`[routing] OSRM sin ruta: code=${data.code}`);
      return null;
    }

    const route = data.routes[0];
    return {
      distancia_km: Math.round((route.distance / 1000) * 100) / 100,
      tiempo_estimado_min: Math.round(route.duration / 60),
      geometria: route.geometry,
    };
  } catch (err) {
    console.warn(`[routing] OSRM error:`, err);
    return null;
  }
}
