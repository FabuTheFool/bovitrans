'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { MapPicker } from '@/components/map/MapPicker';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Point {
  lat: number;
  lon: number;
  label: string;
}

interface SearchResult {
  lat: number;
  lon: number;
  label: string;
}

interface InitialValues {
  solicitante_nombre: string;
  solicitante_contacto: string | null;
  cabezas: number;
  origen: Point;
  destino: Point;
}

export function EditRequestForm({ id, initial }: { id: number; initial: InitialValues }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initial.solicitante_nombre);
  const [contacto, setContacto] = useState(initial.solicitante_contacto ?? '');
  const [cabezas, setCabezas] = useState(initial.cabezas.toString());
  const [origen, setOrigen] = useState<Point>(initial.origen);
  const [destino, setDestino] = useState<Point>(initial.destino);
  const [modoMapa, setModoMapa] = useState<'origen' | 'destino'>('origen');
  const [submitting, setSubmitting] = useState(false);

  const ids = {
    nombre: useId(),
    contacto: useId(),
    cabezas: useId(),
  };

  const coordsChanged =
    origen.lat !== initial.origen.lat ||
    origen.lon !== initial.origen.lon ||
    destino.lat !== initial.destino.lat ||
    destino.lon !== initial.destino.lon;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error('Nombre del solicitante es obligatorio.');
    const cabezasNum = Number(cabezas);
    if (!Number.isInteger(cabezasNum) || cabezasNum < 1)
      return toast.error('Cabezas debe ser un entero ≥ 1.');
    if (origen.lat === destino.lat && origen.lon === destino.lon)
      return toast.error('El origen y el destino no pueden coincidir.');

    setSubmitting(true);
    try {
      // Build el payload sólo con campos modificados
      const patch: Record<string, unknown> = {};
      if (nombre.trim() !== initial.solicitante_nombre) patch.solicitante_nombre = nombre.trim();
      const contactoTrim = contacto.trim() || null;
      if (contactoTrim !== initial.solicitante_contacto) patch.solicitante_contacto = contactoTrim;
      if (cabezasNum !== initial.cabezas) patch.cabezas = cabezasNum;
      if (coordsChanged) {
        patch.origen = origen;
        patch.destino = destino;
      }

      if (Object.keys(patch).length === 0) {
        toast.info('No hay cambios para guardar.');
        return;
      }

      const data = await api.patch<{ route_recalculated: boolean }>(
        `/api/transport-requests/${id}`,
        patch,
      );
      toast.success(
        data.route_recalculated
          ? 'Solicitud guardada · ruta recalculada'
          : 'Solicitud guardada',
      );
      router.push(`/requests/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-5" noValidate>
      <Card className="space-y-5 p-6 lg:col-span-2">
        <div className="space-y-2">
          <Label htmlFor={ids.nombre}>Nombre del solicitante</Label>
          <Input id={ids.nombre} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={ids.contacto}>
            Contacto <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
          </Label>
          <Input id={ids.contacto} type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={ids.cabezas}>Cantidad de cabezas</Label>
          <Input id={ids.cabezas} type="number" value={cabezas} onChange={(e) => setCabezas(e.target.value)} min={1} step={1} required />
        </div>

        <GeoPointInput
          label="Origen"
          kind="origen"
          value={origen}
          activo={modoMapa === 'origen'}
          onChange={setOrigen}
          onActivar={() => setModoMapa('origen')}
        />
        <GeoPointInput
          label="Destino"
          kind="destino"
          value={destino}
          activo={modoMapa === 'destino'}
          onChange={setDestino}
          onActivar={() => setModoMapa('destino')}
        />

        {coordsChanged ? (
          <p className="text-xs text-warning">
            ⓘ Las coordenadas cambiaron — al guardar se recalculará la distancia y el tiempo estimado.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </Card>

      <div className="lg:col-span-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Hacé click en el mapa para mover el pin del{' '}
          <strong className="text-foreground">{modoMapa === 'origen' ? 'origen' : 'destino'}</strong>.
        </p>
        <MapPicker
          origen={origen}
          destino={destino}
          modo={modoMapa}
          onChangeOrigen={async (p) => {
            const label = await reverseGeocodeOrFallback(p.lat, p.lon);
            setOrigen({ ...p, label });
          }}
          onChangeDestino={async (p) => {
            const label = await reverseGeocodeOrFallback(p.lat, p.lon);
            setDestino({ ...p, label });
          }}
        />
      </div>
    </form>
  );
}

async function reverseGeocodeOrFallback(lat: number, lon: number): Promise<string> {
  try {
    const data = await api.get<{ label: string | null }>(`/api/geocoding/reverse?lat=${lat}&lon=${lon}`);
    if (data?.label) return data.label;
  } catch { /* fallback */ }
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function GeoPointInput({
  label,
  kind,
  value,
  activo,
  onChange,
  onActivar,
}: {
  label: string;
  kind: 'origen' | 'destino';
  value: Point;
  activo: boolean;
  onChange: (p: Point) => void;
  onActivar: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SearchResult[]>(`/api/geocoding/search?q=${encodeURIComponent(q)}`);
        setResults(data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const color = kind === 'origen' ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div
      onClick={onActivar}
      className={cn(
        'space-y-2 rounded-lg border p-3 transition-all',
        activo ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <Label className="inline-flex items-center gap-1.5">
          <MapPin className={cn('h-3.5 w-3.5', color)} />
          {label}
        </Label>
        {activo ? <span className="text-xs text-primary">activo en mapa</span> : null}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); onActivar(); }}
          placeholder="Buscar otro lugar (opcional)"
          className="pl-8"
        />
        {open && (loading || results.length > 0) ? (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {loading ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Buscando…</li>
            ) : (
              results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ lat: r.lat, lon: r.lon, label: r.label });
                      setQ('');
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {r.label}
                  </button>
                </li>
              ))
            )}
            {!loading && results.length === 0 && q.length >= 2 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados.</li>
            ) : null}
          </ul>
        ) : null}
      </div>
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className={cn('mt-0.5 h-3 w-3 shrink-0', color)} />
        <span className="break-words">
          {value.label}{' '}
          <span className="text-muted-foreground/60">
            ({value.lat.toFixed(4)}, {value.lon.toFixed(4)})
          </span>
        </span>
      </div>
    </div>
  );
}
