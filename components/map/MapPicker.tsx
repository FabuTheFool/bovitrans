'use client';

import dynamic from 'next/dynamic';

interface Point {
  lat: number;
  lon: number;
}

interface MapPickerProps {
  origen: Point | null;
  destino: Point | null;
  onChangeOrigen: (p: Point) => void;
  onChangeDestino: (p: Point) => void;
  modo: 'origen' | 'destino';
  height?: number;
}

const MapPickerInner = dynamic(() => import('./MapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

export function MapPicker(props: MapPickerProps) {
  return <MapPickerInner {...props} />;
}
