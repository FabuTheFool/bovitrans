'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api, ApiClientError } from '@/lib/client/api-client';
import { MapPicker } from '@/components/map/MapPicker';

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

export function NewRequestForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [cabezas, setCabezas] = useState('');
  const [origen, setOrigen] = useState<Point | null>(null);
  const [destino, setDestino] = useState<Point | null>(null);
  const [modoMapa, setModoMapa] = useState<'origen' | 'destino'>('origen');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) return setError('Nombre del solicitante es obligatorio.');
    const cabezasNum = Number(cabezas);
    if (!Number.isInteger(cabezasNum) || cabezasNum < 1)
      return setError('Cabezas debe ser un entero ≥ 1.');
    if (!origen) return setError('Seleccioná el origen en el mapa o buscador.');
    if (!destino) return setError('Seleccioná el destino en el mapa o buscador.');
    if (origen.lat === destino.lat && origen.lon === destino.lon)
      return setError('El origen y el destino no pueden coincidir.');

    setSubmitting(true);
    try {
      const data = await api.post<{ id: number }>('/api/transport-requests', {
        solicitante_nombre: nombre.trim(),
        solicitante_contacto: contacto.trim() || null,
        cabezas: cabezasNum,
        origen,
        destino,
      });
      router.push(`/requests/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <Field label="Nombre del solicitante">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            required
          />
        </Field>
        <Field label="Contacto (teléfono / email)" optional>
          <input
            type="text"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </Field>
        <Field label="Cantidad de cabezas">
          <input
            type="number"
            value={cabezas}
            onChange={(e) => setCabezas(e.target.value)}
            min={1}
            step={1}
            className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            required
          />
        </Field>

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

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Creando…' : 'Crear solicitud'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-3">
        <p className="mb-2 text-xs text-slate-600">
          Hacé click en el mapa para colocar el pin del{' '}
          <strong>{modoMapa === 'origen' ? 'origen' : 'destino'}</strong>, o usá los buscadores
          de la izquierda.
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

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {optional ? <span className="ml-1 text-xs text-slate-400">(opcional)</span> : null}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

async function reverseGeocodeOrFallback(lat: number, lon: number): Promise<string> {
  try {
    const data = await api.get<{ label: string | null }>(
      `/api/geocoding/reverse?lat=${lat}&lon=${lon}`,
    );
    if (data?.label) return data.label;
  } catch {
    /* fallback abajo */
  }
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
  value: Point | null;
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
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SearchResult[]>(
          `/api/geocoding/search?q=${encodeURIComponent(q)}`,
        );
        setResults(data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div
      className={clsx(
        'rounded-lg border p-3 transition',
        activo ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200',
      )}
      onClick={onActivar}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          <span
            className={
              kind === 'origen'
                ? 'mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500'
                : 'mr-1 inline-block h-2 w-2 rounded-full bg-red-500'
            }
          />
          {label}
        </span>
        {activo ? <span className="text-xs text-brand-700">activo en mapa</span> : null}
      </div>

      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            onActivar();
          }}
          placeholder={value?.label ?? 'Buscar lugar o hacer click en el mapa'}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        {open && (loading || results.length > 0) ? (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {loading ? (
              <li className="px-3 py-2 text-xs text-slate-500">Buscando…</li>
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
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {r.label}
                  </button>
                </li>
              ))
            )}
            {!loading && results.length === 0 && q.length >= 2 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                Sin resultados. Probá click en el mapa.
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {value ? (
        <div className="mt-2 truncate text-xs text-slate-600">
          📍 {value.label}{' '}
          <span className="text-slate-400">
            ({value.lat.toFixed(4)}, {value.lon.toFixed(4)})
          </span>
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-500">Aún no seleccionado.</div>
      )}
    </div>
  );
}
