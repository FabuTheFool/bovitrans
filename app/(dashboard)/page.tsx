import Link from 'next/link';
import { query } from '@/lib/db/client';
import { RequestCard, type RequestCardData } from '@/components/RequestCard';
import type { SolicitudEstado } from '@/components/StatusChip';

export const dynamic = 'force-dynamic';

const ESTADOS: { value: SolicitudEstado | 'todas'; label: string }[] = [
  { value: 'todas',      label: 'Todas' },
  { value: 'pendiente',  label: 'Pendientes' },
  { value: 'asignada',   label: 'Asignadas' },
  { value: 'en_curso',   label: 'En curso' },
  { value: 'completada', label: 'Completadas' },
  { value: 'cancelada',  label: 'Canceladas' },
];

async function loadSolicitudes(filtro?: string) {
  const params: unknown[] = [];
  let where = '';
  if (filtro && filtro !== 'todas') {
    params.push(filtro);
    where = `WHERE estado = $1::solicitud_estado`;
  }
  const res = await query<RequestCardData & { estado: SolicitudEstado }>(
    `SELECT id, solicitante_nombre, cabezas, origen_label, destino_label,
            distancia_km::float AS distancia_km,
            estado::text AS estado, created_at::text AS created_at,
            costo_combustible::float AS costo_combustible,
            con_sobrecapacidad, camion_patente
       FROM v_solicitudes_dashboard
       ${where}
       ORDER BY
         CASE estado
           WHEN 'pendiente' THEN 0
           WHEN 'asignada'  THEN 1
           WHEN 'en_curso'  THEN 2
           WHEN 'completada' THEN 3
           WHEN 'cancelada' THEN 4
         END,
         created_at DESC`,
    params,
  );
  return res.rows;
}

async function loadCounters() {
  const res = await query<{ estado: string; count: number }>(
    `SELECT estado::text AS estado, COUNT(*)::int AS count
       FROM solicitudes
       GROUP BY estado`,
  );
  const map: Record<string, number> = {};
  for (const row of res.rows) map[row.estado] = row.count;
  map.todas = Object.values(map).reduce((a, b) => a + b, 0);
  return map;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const filtro = searchParams.estado ?? 'todas';
  const [solicitudes, counters] = await Promise.all([
    loadSolicitudes(filtro),
    loadCounters(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel principal</h1>
          <p className="mt-1 text-sm text-slate-600">
            Solicitudes de transporte en curso. {counters.todas ?? 0} totales.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <span aria-hidden>+</span> Nueva solicitud
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {ESTADOS.map((e) => {
          const active = filtro === e.value;
          const count = counters[e.value] ?? 0;
          return (
            <Link
              key={e.value}
              href={e.value === 'todas' ? '/' : `/?estado=${e.value}`}
              className={
                active
                  ? 'inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
              }
            >
              {e.label}
              <span
                className={
                  active
                    ? 'rounded-full bg-white/20 px-1.5 text-xs'
                    : 'rounded-full bg-white px-1.5 text-xs text-slate-600'
                }
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {solicitudes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-4xl">📋</div>
          <h2 className="mt-3 font-semibold text-slate-900">
            {filtro === 'todas'
              ? 'Aún no hay solicitudes registradas'
              : `Sin solicitudes en estado "${filtro}"`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {filtro === 'todas'
              ? 'Cargá la primera solicitud para empezar a operar.'
              : 'Probá cambiar el filtro o crear una nueva solicitud.'}
          </p>
          <Link
            href="/requests/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Crear primera solicitud
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {solicitudes.map((s) => (
            <RequestCard key={s.id} req={s as RequestCardData} />
          ))}
        </div>
      )}
    </div>
  );
}
