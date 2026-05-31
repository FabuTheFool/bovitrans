import Link from 'next/link';
import { query } from '@/lib/db/client';
import { formatDateTime } from '@/lib/client/format';

export const dynamic = 'force-dynamic';

interface CamionRow {
  id: number;
  patente: string;
  capacidad_max: number;
  consumo_l_km: number;
  estado: 'activo' | 'inactivo';
  created_at: string;
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const filtroActivos = searchParams.estado === 'activo';
  const result = await query<CamionRow>(
    `SELECT id, patente, capacidad_max,
            consumo_l_km::float AS consumo_l_km,
            estado::text AS estado,
            created_at::text AS created_at
       FROM camiones
       ${filtroActivos ? "WHERE estado = 'activo'" : ''}
       ORDER BY (estado = 'activo') DESC, created_at DESC`,
  );
  const camiones = result.rows;
  const activos = camiones.filter((c) => c.estado === 'activo').length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Flota</h1>
          <p className="mt-1 text-sm text-slate-600">
            {camiones.length} camiones registrados · {activos} activos.
          </p>
        </div>
        <Link
          href="/fleet/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <span aria-hidden>+</span> Nuevo camión
        </Link>
      </header>

      <div className="flex gap-2">
        <Link
          href="/fleet"
          className={
            !filtroActivos
              ? 'rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
          }
        >
          Todos
        </Link>
        <Link
          href="/fleet?estado=activo"
          className={
            filtroActivos
              ? 'rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
          }
        >
          Sólo activos
        </Link>
      </div>

      {camiones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-4xl">🚚</div>
          <h2 className="mt-3 font-semibold text-slate-900">
            No hay camiones registrados
          </h2>
          <Link
            href="/fleet/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Registrar primer camión
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Patente</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Consumo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Registrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {camiones.map((c) => (
                <tr
                  key={c.id}
                  className={c.estado === 'inactivo' ? 'bg-slate-50/50 text-slate-500' : ''}
                >
                  <td className="px-4 py-3 font-mono font-semibold">{c.patente}</td>
                  <td className="px-4 py-3">{c.capacidad_max} cabezas</td>
                  <td className="px-4 py-3">{c.consumo_l_km} L/Km</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.estado === 'activo'
                          ? 'inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200'
                          : 'inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600'
                      }
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/fleet/${c.id}`}
                      className="text-brand-700 hover:text-brand-900 hover:underline"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
