import Link from 'next/link';
import { Beef, MapPin, Route, Coins, AlertTriangle, Truck, Pencil } from 'lucide-react';
import { StatusChip, type SolicitudEstado } from './StatusChip';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatKm, formatRelativeDate } from '@/lib/client/format';

export interface RequestCardData {
  id: number;
  solicitante_nombre: string;
  solicitante_contacto?: string | null;
  cabezas: number;
  origen_label: string;
  destino_label: string;
  distancia_km: number | null;
  estado: SolicitudEstado;
  created_at: string;
  costo_combustible: number | null;
  con_sobrecapacidad: boolean | null;
  camion_patente: string | null;
}

export function RequestCard({ req }: { req: RequestCardData }) {
  const canEdit = req.estado === 'pendiente';

  return (
    <div className="group relative">
      <Link href={`/requests/${req.id}`} className="block focus-visible:outline-none">
        <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/30 group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {req.solicitante_nombre}
                </h3>
                {req.con_sobrecapacidad ? (
                  <span
                    title="Asignación con sobrecapacidad"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    aria-label="Asignación con sobrecapacidad"
                  >
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                #{req.id} · {formatRelativeDate(req.created_at)}
              </p>
            </div>
            <StatusChip status={req.estado} />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="truncate text-foreground">{req.origen_label}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <span className="truncate text-foreground">{req.destino_label}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
            <Metric icon={<Beef className="h-3.5 w-3.5" />} label="Cabezas" value={req.cabezas.toString()} />
            <Metric icon={<Route className="h-3.5 w-3.5" />} label="Distancia" value={formatKm(req.distancia_km)} />
            <Metric
              icon={<Coins className="h-3.5 w-3.5" />}
              label="Costo"
              value={req.costo_combustible != null ? formatCurrency(req.costo_combustible) : '—'}
            />
          </div>

          {req.camion_patente ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
              <Truck className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono">{req.camion_patente}</span>
            </div>
          ) : null}
        </Card>
      </Link>

      {/* Quick-edit icon: solo cuando la solicitud es editable (pendiente).
          Bottom-right de la card. Siempre visible en mobile; hover-only en desktop. */}
      {canEdit ? (
        <Link
          href={`/requests/${req.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Editar solicitud #${req.id}`}
          title="Editar"
          data-no-drag
          className="absolute bottom-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}
