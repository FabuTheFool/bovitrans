'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ensureLeafletIconsPatched, colorIcon } from './leaflet-icons';

const TILES_URL =
  process.env.NEXT_PUBLIC_TILES_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

interface Point {
  lat: number;
  lon: number;
}

interface MapPickerInnerProps {
  origen: Point | null;
  destino: Point | null;
  onChangeOrigen: (p: Point) => void;
  onChangeDestino: (p: Point) => void;
  /** Cuál pin se está editando al hacer click. */
  modo: 'origen' | 'destino';
  height?: number;
}

function ClickHandler({
  modo,
  onOrigen,
  onDestino,
}: {
  modo: 'origen' | 'destino';
  onOrigen: (p: Point) => void;
  onDestino: (p: Point) => void;
}) {
  useMapEvents({
    click(e) {
      const p = { lat: e.latlng.lat, lon: e.latlng.lng };
      if (modo === 'origen') onOrigen(p);
      else onDestino(p);
    },
  });
  return null;
}

export default function MapPickerInner({
  origen,
  destino,
  onChangeOrigen,
  onChangeDestino,
  modo,
  height = 400,
}: MapPickerInnerProps) {
  ensureLeafletIconsPatched();
  const [center] = useState<L.LatLngExpression>(
    origen
      ? [origen.lat, origen.lon]
      : destino
        ? [destino.lat, destino.lon]
        : [-33, -56], // Uruguay aprox.
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url={TILES_URL}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler modo={modo} onOrigen={onChangeOrigen} onDestino={onChangeDestino} />
        {origen ? (
          <Marker position={[origen.lat, origen.lon]} icon={colorIcon('origen')} />
        ) : null}
        {destino ? (
          <Marker position={[destino.lat, destino.lon]} icon={colorIcon('destino')} />
        ) : null}
      </MapContainer>
    </div>
  );
}

