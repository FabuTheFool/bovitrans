import { query } from '@/lib/db/client';
import type { RequestCardData } from '@/components/RequestCard';
import type { SolicitudEstado } from '@/components/StatusChip';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

async function loadSolicitudes(filtro?: string) {
  const params: unknown[] = [];
  let where = '';
  if (filtro && filtro !== 'todas') {
    params.push(filtro);
    where = `WHERE estado = $1::solicitud_estado`;
  }
  const res = await query<RequestCardData & { estado: SolicitudEstado }>(
    `SELECT id, solicitante_nombre, solicitante_contacto, cabezas,
            origen_label, destino_label,
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

  return <DashboardClient solicitudes={solicitudes} counters={counters} />;
}
