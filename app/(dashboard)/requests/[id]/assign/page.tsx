import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db/client';
import { getFuelPrice } from '@/lib/repositories/settings';
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

  // Si la solicitud no está pendiente, redirigir al detalle.
  if (solicitud.estado !== 'pendiente') {
    redirect(`/requests/${id}`);
  }

  // Camiones activos que NO tengan asignación activa actualmente.
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/requests/${id}`} className="text-sm text-brand-700 hover:underline">
          ← Volver al detalle
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Asignar camión — {solicitud.solicitante_nombre}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Solicitud #{solicitud.id} · {solicitud.cabezas} cabezas
          {solicitud.distancia_km ? ` · ${solicitud.distancia_km} km` : ' · sin distancia'}
        </p>
      </div>

      {solicitud.distancia_km == null ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠ La solicitud no tiene distancia calculada. No se puede asignar hasta que se
          recalcule la ruta desde el detalle de la solicitud.
        </div>
      ) : camionesRes.rowCount === 0 ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-700">
          No hay camiones activos disponibles. Todos están asignados a otras solicitudes o
          inactivos.
        </div>
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
