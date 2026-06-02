'use client';

import dynamic from 'next/dynamic';
import type { RouteMapPoint } from './RouteMapInner';

/**
 * Wrapper externo del mapa de ruta. Hace `dynamic(import)` con `ssr: false`
 * porque Leaflet no funciona del lado del servidor (necesita `window`).
 *
 * Mostramos un placeholder durante la carga para que el layout no salte.
 */
const RouteMapInner = dynamic(() => import('./RouteMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

export function RouteMap(props: {
  origen: RouteMapPoint;
  destino: RouteMapPoint;
  height?: number;
}) {
  return <RouteMapInner {...props} />;
}
