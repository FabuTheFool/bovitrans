import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Beef, Route, Clock, Coins, Truck as TruckIcon, AlertTriangle } from 'lucide-react';
import { query } from '@/lib/db/client';
import { RouteMap } from '@/components/map/RouteMap';
import { StatusChip, type SolicitudEstado } from '@/components/StatusChip';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatKm, formatMinutes } from '@/lib/client/format';
import { RecalculateRouteButton } from '@/components/RecalculateRouteButton';
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
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {s.solicitante_nombre}
            </h1>
            <StatusChip status={s.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            Solicitud #{s.id} · creada el {formatDateTime(s.created_at)}
            {s.solicitante_contacto ? ` · ${s.solicitante_contacto}` : ''}
          </p>
        </div>
        <RequestActions id={s.id} estado={s.estado} asignacionId={s.asignacion_id} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Beef className="h-4 w-4" />} label="Cabezas" value={s.cabezas.toString()} />
        <Stat
          icon={<Route className="h-4 w-4" />}
          label="Distancia"
          value={formatKm(s.distancia_km)}
          action={<RecalculateRouteButton id={s.id} />}
        />
        <Stat icon={<Clock className="h-4 w-4" />} label="Tiempo estimado" value={formatMinutes(s.tiempo_estimado_min)} />
        <Stat
          icon={<Coins className="h-4 w-4" />}
          label={s.asignacion_id ? 'Costo (snapshot)' : 'Costo combustible'}
          value={s.costo_combustible != null ? formatCurrency(s.costo_combustible) : '—'}
        />
      </section>

      {s.asignacion_id ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-primary" />
                <h2 className="font-semibold tracking-tight">Camión asignado</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                <Link
                  href={`/fleet/${s.camion_id}`}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {s.camion_patente}
                </Link>{' '}
                · capacidad {s.camion_capacidad} cabezas
              </p>
            </div>
            {s.con_sobrecapacidad ? (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3" />
                Asignada con sobrecapacidad
              </Badge>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold tracking-tight">Ruta</h2>
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

function Stat({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        {action}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}

function RoutePoint({ kind, label }: { kind: 'origen' | 'destino'; label: string }) {
  const color = kind === 'origen' ? 'text-emerald-500' : 'text-rose-500';
  return (
    <Card className="flex items-start gap-3 p-3">
      <MapPin className={`mt-1 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kind}</div>
        <div className="break-words text-sm font-medium">{label}</div>
      </div>
    </Card>
  );
}
