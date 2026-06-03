import Link from 'next/link';
import { Plus, Truck as TruckIcon } from 'lucide-react';
import { query } from '@/lib/db/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/client/format';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Flota</h1>
          <p className="text-sm text-muted-foreground">
            {camiones.length} camiones registrados · {activos} activos
          </p>
        </div>
        <Button asChild>
          <Link href="/fleet/new">
            <Plus className="h-4 w-4" />
            Nuevo camión
          </Link>
        </Button>
      </header>

      <div className="flex gap-2">
        <Button asChild variant={!filtroActivos ? 'default' : 'secondary'} size="sm">
          <Link href="/fleet">Todos</Link>
        </Button>
        <Button asChild variant={filtroActivos ? 'default' : 'secondary'} size="sm">
          <Link href="/fleet?estado=activo">Sólo activos</Link>
        </Button>
      </div>

      {camiones.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <TruckIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold tracking-tight">No hay camiones registrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrá el primero para empezar a planificar viajes.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/fleet/new">
                <Plus className="h-4 w-4" />
                Registrar primer camión
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Patente</th>
                  <th className="px-4 py-3">Capacidad</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Registrado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {camiones.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      c.estado === 'inactivo' && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3 font-mono font-semibold">{c.patente}</td>
                    <td className="px-4 py-3">{c.capacidad_max} cabezas</td>
                    <td className="px-4 py-3">{c.consumo_l_km} L/Km</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.estado === 'activo' ? 'success' : 'muted'}>
                        {c.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="link" size="sm">
                        <Link href={`/fleet/${c.id}`}>Ver detalle →</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
