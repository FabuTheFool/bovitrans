'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ensureLeafletIconsPatched, colorIcon } from './leaflet-icons';

export interface RouteMapPoint {
  lat: number;
  lon: number;
  label: string;
}

interface RouteMapInnerProps {
  origen: RouteMapPoint;
  destino: RouteMapPoint;
  height?: number;
}

const TILES_URL =
  process.env.NEXT_PUBLIC_TILES_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function FitBounds({ points }: { points: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function RouteMapInner({ origen, destino, height = 360 }: RouteMapInnerProps) {
  ensureLeafletIconsPatched();
  const [polyline, setPolyline] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM responded ' + res.status);
        const data = (await res.json()) as {
          code?: string;
          routes?: Array<{ geometry: { coordinates: [number, number][] } }>;
        };
        if (cancelled) return;
        if (data.code !== 'Ok' || !data.routes?.[0]) {
          throw new Error('Sin ruta.');
        }
        setPolyline(
          data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
        );
      } catch (err) {
        if (!cancelled) {
          setRouteError(err instanceof Error ? err.message : 'Error desconocido.');
          // Fallback: línea recta.
          setPolyline([
            [origen.lat, origen.lon],
            [destino.lat, destino.lon],
          ]);
        }
      }
    }
    fetchRoute();
    return () => { cancelled = true; };
  }, [origen.lat, origen.lon, destino.lat, destino.lon]);

  const center: L.LatLngExpression = [
    (origen.lat + destino.lat) / 2,
    (origen.lon + destino.lon) / 2,
  ];
  const points: L.LatLngExpression[] = [
    [origen.lat, origen.lon],
    [destino.lat, destino.lon],
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={7}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url={TILES_URL}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[origen.lat, origen.lon]} icon={colorIcon('origen')}>
          <Popup>
            <strong>Origen</strong>
            <br />
            {origen.label}
          </Popup>
        </Marker>
        <Marker position={[destino.lat, destino.lon]} icon={colorIcon('destino')}>
          <Popup>
            <strong>Destino</strong>
            <br />
            {destino.label}
          </Popup>
        </Marker>
        {polyline ? (
          <Polyline positions={polyline} color="#2d6d43" weight={4} opacity={0.8} />
        ) : null}
        <FitBounds points={points} />
      </MapContainer>
      {routeError ? (
        <p className="absolute bottom-2 left-2 right-2 rounded-md bg-amber-50/95 px-3 py-1 text-xs text-amber-900 shadow">
          ⚠ Ruta real no disponible — mostrando línea directa.
        </p>
      ) : null}
    </div>
  );
}
