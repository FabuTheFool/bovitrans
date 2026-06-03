/**
 * Routing entre origen y destino.
 *
 * Estrategia robusta:
 *   1) Intentamos OSRM público (rutas reales sobre OpenStreetMap) con timeout 6s.
 *   2) Si OSRM no responde, no devuelve ruta, o tarda demasiado → fallback
 *      a distancia haversine (gran círculo) × 1.3 (factor típico de sinuosidad
 *      vial) y tiempo estimado a 60 km/h promedio.
 *
 * De esta forma, la solicitud SIEMPRE tiene distancia calculada y no se
 * bloquea la asignación de camiones. El usuario puede recalcular más tarde
 * desde la pantalla de detalle para upgradear a una ruta OSRM real.
 */

export interface RouteResult {
  distancia_km: number;
  tiempo_estimado_min: number;
  geometria: GeoJSON.LineString | null;
  /** true cuando el resultado es fallback haversine, no OSRM real. */
  is_approximate: boolean;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';
const OSRM_TIMEOUT_MS = 6000;
const ROAD_FACTOR = 1.3;      // sinuosidad vial vs gran círculo
const AVG_SPEED_KMH = 60;     // velocidad promedio asumida para fallback

interface LatLon { lat: number; lon: number }

export async function calcularRuta(origen: LatLon, destino: LatLon): Promise<RouteResult> {
  const osrm = await tryOsrm(origen, destino);
  if (osrm) return osrm;
  return haversineFallback(origen, destino);
}

async function tryOsrm(origen: LatLon, destino: LatLon): Promise<RouteResult | null> {
  const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=simplified&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BoviTrans/0.1 (MVP)' },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn(`[routing] OSRM ${res.status} para ${coords}`);
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
      distancia_km: round2(route.distance / 1000),
      tiempo_estimado_min: Math.round(route.duration / 60),
      geometria: route.geometry,
      is_approximate: false,
    };
  } catch (err) {
    const reason = (err as Error)?.name === 'AbortError' ? 'timeout' : (err as Error)?.message;
    console.warn(`[routing] OSRM falló (${reason}) — usando haversine`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fórmula haversine para distancia entre dos puntos en la superficie terrestre.
 * Multiplicamos por ROAD_FACTOR para aproximar distancia real de ruta vial.
 */
function haversineFallback(origen: LatLon, destino: LatLon): RouteResult {
  const R = 6371; // radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(origen.lat);
  const φ2 = toRad(destino.lat);
  const Δφ = toRad(destino.lat - origen.lat);
  const Δλ = toRad(destino.lon - origen.lon);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const greatCircleKm = R * c;
  const roadKm = round2(greatCircleKm * ROAD_FACTOR);
  const timeMin = Math.max(1, Math.round((roadKm / AVG_SPEED_KMH) * 60));

  // Polyline mínimo: línea recta entre los dos puntos para que el mapa
  // pueda mostrar algo cuando no hay geometría real de OSRM.
  const geometria: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: [
      [origen.lon, origen.lat],
      [destino.lon, destino.lat],
    ],
  };

  return {
    distancia_km: roadKm,
    tiempo_estimado_min: timeMin,
    geometria,
    is_approximate: true,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
