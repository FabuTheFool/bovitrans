import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db/client';
import { RouteMap } from '@/components/map/RouteMap';
import { StatusChip, type SolicitudEstado } from '@/components/StatusChip';
import { formatCurrency, formatDateTime, formatKm, formatMinutes } from '@/lib/client/format';
import { RequestActions } from './RequestActions';

export const dynamic = 'force-dynamic';

interface SolicitudDetail {
  id: number;
  solicitante_nombre: string;
  solicitante_contacto: string | null;
  cabezas: number;
  origen_lat: number;
  origen_lon: number;
  origen_label: string;
  destino_lat: number;
  destino_lon: number;
  destino_label: string;
  distancia_km: number | null;
  tiempo_estimado_min: number | null;
  estado: SolicitudEstado;
  created_at: string;
  asignacion_id: number | null;
  costo_combustible: number | null;
  con_sobrecapacidad: boolean | null;
  camion_id: number | null;
  camion_patente: string | null;
  camion_capacidad: number | null;
}

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const result = await query<SolicitudDetail>(
    `SELECT id, solicitante_nombre, solicitante_contacto, cabezas,
            origen_lat::float, origen_lon::float, origen_label,
            destino_lat::float, destino_lon::float, destino_label,
            distancia_km::float, tiempo_estimado_min,
            estado::text AS estado, created_at::text,
            asignacion_id, costo_combustible::float, con_sobrecapacidad,
            camion_id, camion_patente, camion_capacidad
       FROM v_solicitudes_dashboard
      WHERE id = $1`,
    [id],
  );
  if (result.rowCount === 0) notFound();
  const s = result.rows[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-700 hover:underline">
          ← Volver al panel
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {s.solicitante_nombre}
              </h1>
              <StatusChip status={s.estado} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Solicitud #{s.id} · creada el {formatDateTime(s.created_at)}
              {s.solicitante_contacto ? ` · ${s.solicitante_contacto}` : ''}
            </p>
          </div>
          <RequestActions
            id={s.id}
            estado={s.estado}
            asignacionId={s.asignacion_id}
          />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cabezas" value={s.cabezas.toString()} />
        <Stat label="Distancia" value={formatKm(s.distancia_km)} />
        <Stat label="Tiempo estimado" value={formatMinutes(s.tiempo_estimado_min)} />
        <Stat
          label={s.asignacion_id ? 'Costo combustible (snapshot)' : 'Costo combustible'}
          value={s.costo_combustible != null ? formatCurrency(s.costo_combustible) : '—'}
        />
      </section>

      {s.asignacion_id ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Camión asignado</h2>
              <p className="mt-1 text-sm text-slate-600">
                <Link
                  href={`/fleet/${s.camion_id}`}
                  className="font-mono font-semibold text-brand-700 hover:underline"
                >
                  {s.camion_patente}
                </Link>{' '}
                · capacidad {s.camion_capacidad} cabezas
              </p>
              {s.con_sobrecapacidad ? (
                <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                  ⚠ Asignada con sobrecapacidad
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Ruta</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <RoutePoint kind="origen" label={s.origen_label} />
            <RoutePoint kind="destino" label={s.destino_label} />
          </div>
          <div className="lg:col-span-2">
            <RouteMap
              origen={{ lat: s.origen_lat, lon: s.origen_lon, label: s.origen_label }}
              destino={{ lat: s.destino_lat, lon: s.destino_lon, label: s.destino_label }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function RoutePoint({ kind, label }: { kind: 'origen' | 'destino'; label: string }) {
  const color = kind === 'origen' ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span className={`mt-1.5 h-3 w-3 flex-none rounded-full ${color}`} />
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase text-slate-500">{kind}</div>
        <div className="break-words text-sm text-slate-900">{label}</div>
      </div>
    </div>
  );
}
