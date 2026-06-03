import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Truck, Route, Fuel, Coins, AlertTriangle } from 'lucide-react';
import { query } from '@/lib/db/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  const activeCount = historicoRes.rows.filter((r) => r.estado === 'activa').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/fleet"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a flota
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-3xl font-semibold tracking-tight">{camion.patente}</h1>
            <Badge variant={camion.estado === 'activo' ? 'success' : 'muted'}>{camion.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Registrado el {formatDateTime(camion.created_at)}
          </p>
        </div>
        <TruckActions id={camion.id} estado={camion.estado} asignacionesActivas={activeCount} />
      </div>

      {/* Atributos inmutables */}
      <section className="grid gap-4 sm:grid-cols-3">
        <ImmutableField icon={<Truck className="h-4 w-4" />} label="Capacidad máxima" value={`${camion.capacidad_max} cabezas`} />
        <ImmutableField icon={<Fuel className="h-4 w-4" />} label="Consumo de combustible" value={`${camion.consumo_l_km} L/Km`} />
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estado</div>
          <div className="mt-2 capitalize">
            <Badge variant={camion.estado === 'activo' ? 'success' : 'muted'}>{camion.estado}</Badge>
          </div>
        </Card>
      </section>

      {/* Agregados */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Viajes totales" value={agregados.total_viajes.toString()} icon={<Route className="h-4 w-4" />} />
        <Stat label="Km recorridos" value={formatKm(agregados.total_km)} icon={<Route className="h-4 w-4" />} />
        <Stat label="Litros consumidos" value={`${agregados.total_litros.toFixed(1)} L`} icon={<Fuel className="h-4 w-4" />} />
        <Stat label="Costo acumulado" value={formatCurrency(agregados.total_costo)} icon={<Coins className="h-4 w-4" />} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold tracking-tight">Histórico de asignaciones</h2>
        {historicoRes.rowCount === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Este camión aún no tiene asignaciones.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Solicitud</th>
                    <th className="px-4 py-3">Cabezas</th>
                    <th className="px-4 py-3">Distancia</th>
                    <th className="px-4 py-3">Costo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historicoRes.rows.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/requests/${a.solicitud_id}`} className="text-primary hover:underline">
                          #{a.solicitud_id} — {a.solicitante_nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{a.cabezas_aplicadas}</span>
                          {a.con_sobrecapacidad ? (
                            <span title="Sobrecapacidad" className="text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatKm(a.distancia_km_aplicada)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(a.costo_combustible)}</td>
                      <td className="px-4 py-3 capitalize">
                        <Badge variant={a.estado === 'completada' ? 'success' : a.estado === 'activa' ? 'accent' : 'muted'}>
                          {a.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function ImmutableField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" aria-label="Campo inmutable" />
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}
