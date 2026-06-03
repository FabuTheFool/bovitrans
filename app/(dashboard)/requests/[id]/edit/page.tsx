import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { query } from '@/lib/db/client';
import { EditRequestForm } from './EditRequestForm';

export const dynamic = 'force-dynamic';

interface SolicitudRow {
  id: number;
  solicitante_nombre: string;
  solicitante_contacto: string | null;
  cabezas: number;
  origen_lat: number;
  origen_lon: number;
  origen_label: string;
  destino_lat: number;
  destino_lon: number;
  destino_label: string;
  estado: string;
}

export default async function EditRequestPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const res = await query<SolicitudRow>(
    `SELECT id, solicitante_nombre, solicitante_contacto, cabezas,
            origen_lat::float, origen_lon::float, origen_label,
            destino_lat::float, destino_lon::float, destino_label,
            estado::text AS estado
       FROM solicitudes WHERE id = $1`,
    [id],
  );
  if (res.rowCount === 0) notFound();
  const s = res.rows[0];

  // Sólo editable en pendiente — si no, redirige al detalle
  if (s.estado !== 'pendiente') {
    redirect(`/requests/${id}`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href={`/requests/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al detalle
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Editar solicitud</h1>
        <p className="text-sm text-muted-foreground">
          {s.solicitante_nombre} · Solicitud #{s.id}. Si cambiás origen o destino, la distancia se recalcula automáticamente.
        </p>
      </div>
      <EditRequestForm
        id={s.id}
        initial={{
          solicitante_nombre: s.solicitante_nombre,
          solicitante_contacto: s.solicitante_contacto,
          cabezas: s.cabezas,
          origen: { lat: s.origen_lat, lon: s.origen_lon, label: s.origen_label },
          destino: { lat: s.destino_lat, lon: s.destino_lon, label: s.destino_label },
        }}
      />
    </div>
  );
}
