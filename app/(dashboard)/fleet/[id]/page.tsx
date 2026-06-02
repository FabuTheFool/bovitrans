import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db/client';
import { formatCurrency, formatDateTime, formatKm } from '@/lib/client/format';
import { TruckActions } from './TruckActions';

export const dynamic = 'force-dynamic';

interface CamionDetail {
  id: number;
  patente: string;
  capacidad_max: number;
  consumo_l_km: number;
  estado: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
}

interface AsignacionRow {
  id: number;
  solicitud_id: number;
  solicitante_nombre: string;
  cabezas_aplicadas: number;
  distancia_km_aplicada: number;
  costo_combustible: number;
  estado: string;
  con_sobrecapacidad: boolean;
  created_at: string;
}

interface Agregados {
  total_km: number;
  total_litros: number;
  total_costo: number;
  total_viajes: number;
}

export default async function TruckDetailPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const camionRes = await query<CamionDetail>(
    `SELECT id, patente, capacidad_max,
            consumo_l_km::float AS consumo_l_km,
            estado::text AS estado,
            created_at::text, updated_at::text
       FROM camiones WHERE id = $1`,
    [id],
  );
  if (camionRes.rowCount === 0) notFound();
  const camion = camionRes.rows[0];

  const historicoRes = await query<AsignacionRow>(
    `SELECT a.id, a.solicitud_id, s.solicitante_nombre,
            a.cabezas_aplicadas,
            a.distancia_km_aplicada::float AS distancia_km_aplicada,
            a.costo_combustible::float AS costo_combustible,
            a.estado::text AS estado,
            a.con_sobrecapacidad,
            a.created_at::text
       FROM asignaciones a
       JOIN solicitudes s ON s.id = a.solicitud_id
      WHERE a.camion_id = $1
      ORDER BY a.created_at DESC
      LIMIT 100`,
    [id],
  );

  const agregadosRes = await query<Agregados>(
    `SELECT COALESCE(SUM(distancia_km_aplicada), 0)::float        AS total_km,
            COALESCE(SUM(distancia_km_aplicada * consumo_aplicado), 0)::float AS total_litros,
            COALESCE(SUM(costo_combustible), 0)::float            AS total_costo,
            COUNT(*)::int                                         AS total_viajes
       FROM asignaciones WHERE camion_id = $1`,
    [id],
  );
  const agregados = agregadosRes.rows[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/fleet" className="text-sm text-brand-700 hover:underline">
          ← Volver a flota
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-semibold text-slate-900">
              {camion.patente}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Registrado el {formatDateTime(camion.created_at)}
            </p>
          </div>
          <TruckActions
            id={camion.id}
            estado={camion.estado}
            asignacionesActivas={historicoRes.rows.filter((r) => r.estado === 'activa').length}
          />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <ImmutableField
          label="Capacidad máxima"
          value={`${camion.capacidad_max} cabezas`}
        />
        <ImmutableField
          label="Consumo de combustible"
          value={`${camion.consumo_l_km} L/Km`}
        />
        <ImmutableField
          label="Estado"
          value={camion.estado}
          editable
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Viajes totales" value={agregados.total_viajes.toString()} />
        <Stat label="Km recorridos" value={formatKm(agregados.total_km)} />
        <Stat label="Litros consumidos" value={`${agregados.total_litros.toFixed(1)} L`} />
        <Stat label="Costo acumulado" value={formatCurrency(agregados.total_costo)} />
      </section>

      <section>
        <h2 className="font-semibold text-slate-900">Histórico de asignaciones</h2>
        {historicoRes.rowCount === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Este camión aún no tiene asignaciones.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Cabezas</th>
                  <th className="px-4 py-3">Distancia</th>
                  <th className="px-4 py-3">Costo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historicoRes.rows.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/requests/${a.solicitud_id}`}
                        className="text-brand-700 hover:underline"
                      >
                        #{a.solicitud_id} — {a.solicitante_nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {a.cabezas_aplicadas}
                      {a.con_sobrecapacidad ? (
                        <span className="ml-2 text-xs text-red-600">⚠ sobrecapacidad</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatKm(a.distancia_km_aplicada)}</td>
                    <td className="px-4 py-3">{formatCurrency(a.costo_combustible)}</td>
                    <td className="px-4 py-3 capitalize">{a.estado}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(a.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ImmutableField({
  label,
  value,
  editable,
}: {
  label: string;
  value: string;
  editable?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {!editable ? <span title="Campo inmutable" aria-hidden>🔒</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold capitalize text-slate-900">{value}</div>
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
