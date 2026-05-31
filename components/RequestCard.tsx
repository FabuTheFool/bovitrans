import Link from 'next/link';
import { StatusChip, type SolicitudEstado } from './StatusChip';
import { formatCurrency, formatKm, formatRelativeDate } from '@/lib/client/format';

export interface RequestCardData {
  id: number;
  solicitante_nombre: string;
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
  return (
    <Link
      href={`/requests/${req.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand-700">
              {req.solicitante_nombre}
            </h3>
            {req.con_sobrecapacidad ? (
              <span
                title="Asignación con sobrecapacidad"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700"
              >
                !
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            {formatRelativeDate(req.created_at)} · #{req.id}
          </p>
        </div>
        <StatusChip status={req.estado} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
          <span className="truncate text-slate-700">{req.origen_label}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-2 w-2 flex-none rounded-full bg-red-500" />
          <span className="truncate text-slate-700">{req.destino_label}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
        <div>
          <div className="text-slate-500">Cabezas</div>
          <div className="font-semibold text-slate-900">{req.cabezas}</div>
        </div>
        <div>
          <div className="text-slate-500">Distancia</div>
          <div className="font-semibold text-slate-900">{formatKm(req.distancia_km)}</div>
        </div>
        <div>
          <div className="text-slate-500">Costo</div>
          <div className="font-semibold text-slate-900">
            {req.costo_combustible != null
              ? formatCurrency(req.costo_combustible)
              : '—'}
          </div>
        </div>
      </div>

      {req.camion_patente ? (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
          <span aria-hidden>🚚</span>
          <span className="font-mono">{req.camion_patente}</span>
        </div>
      ) : null}
    </Link>
  );
}
