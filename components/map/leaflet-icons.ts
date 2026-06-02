/**
 * Fix de íconos de Leaflet en bundlers (Next/Webpack).
 *
 * Leaflet hace `require()` interno para resolver las URLs de los íconos
 * por defecto, lo que no funciona bajo Webpack. Re-mapeamos los URLs a
 * CDN de unpkg para evitar inflar el bundle.
 */

import L from 'leaflet';

// Solo correr una vez por sesión.
let patched = false;

export function ensureLeafletIconsPatched(): void {
  if (patched) return;
  const Icon = L.Icon.Default as unknown as {
    prototype: { _getIconUrl?: () => string };
    mergeOptions: (opts: Record<string, unknown>) => void;
  };
  delete Icon.prototype._getIconUrl;
  Icon.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  patched = true;
}

const ORIGEN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 27 17 27s17-14.2 17-27C34 7.6 26.4 0 17 0z" fill="#16a34a"/>
  <circle cx="17" cy="17" r="6" fill="#ffffff"/>
</svg>`;

const DESTINO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 27 17 27s17-14.2 17-27C34 7.6 26.4 0 17 0z" fill="#dc2626"/>
  <circle cx="17" cy="17" r="6" fill="#ffffff"/>
</svg>`;

export function colorIcon(kind: 'origen' | 'destino'): L.Icon {
  const svg = kind === 'origen' ? ORIGEN_SVG : DESTINO_SVG;
  return L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -38],
  });
}
