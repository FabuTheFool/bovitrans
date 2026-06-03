import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { query } from '@/lib/db/client';
import { getFuelPrice } from '@/lib/repositories/settings';
import { Card } from '@/components/ui/card';
import { AssignForm } from './AssignForm';

export const dynamic = 'force-dynamic';

interface Solicitud {
  id: number;
  solicitante_nombre: string;
  cabezas: number;
  distancia_km: number | null;
  estado: string;
}

interface Camion {
  id: number;
  patente: string;
  capacidad_max: number;
  consumo_l_km: number;
}

export default async function AssignPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const solRes = await query<Solicitud>(
    `SELECT id, solicitante_nombre, cabezas,
            distancia_km::float AS distancia_km,
            estado::text AS estado
       FROM solicitudes WHERE id = $1`,
    [id],
  );
  if (solRes.rowCount === 0) notFound();
  const solicitud = solRes.rows[0];

  if (solicitud.estado !== 'pendiente') {
    redirect(`/requests/${id}`);
  }

  const camionesRes = await query<Camion>(
    `SELECT c.id, c.patente, c.capacidad_max,
            c.consumo_l_km::float AS consumo_l_km
       FROM camiones c
      WHERE c.estado = 'activo'
        AND NOT EXISTS (
              SELECT 1 FROM asignaciones a
               WHERE a.camion_id = c.id AND a.estado = 'activa'
            )
      ORDER BY c.capacidad_max ASC`,
  );

  const fuelPrice = await getFuelPrice();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Link
        href={`/requests/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al detalle
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Asignar camión
        </h1>
        <p className="text-sm text-muted-foreground">
          {solicitud.solicitante_nombre} · Solicitud #{solicitud.id} · {solicitud.cabezas} cabezas
          {solicitud.distancia_km ? ` · ${solicitud.distancia_km} km` : ' · sin distancia'}
        </p>
      </div>

      {solicitud.distancia_km == null ? (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-foreground">
              La solicitud no tiene distancia calculada. No se puede asignar hasta que se recalcule la ruta desde el detalle de la solicitud.
            </p>
          </div>
        </Card>
      ) : camionesRes.rowCount === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay camiones activos disponibles. Todos están asignados a otras solicitudes o inactivos.
          </p>
        </Card>
      ) : (
        <AssignForm
          solicitudId={solicitud.id}
          cabezas={solicitud.cabezas}
          distanciaKm={solicitud.distancia_km}
          camiones={camionesRes.rows}
          precioLitro={fuelPrice.amount}
          currency={fuelPrice.currency}
        />
      )}
    </div>
  );
}
