'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';
import type { SolicitudEstado } from '@/components/StatusChip';

export function RequestActions({
  id,
  estado,
  asignacionId,
}: {
  id: number;
  estado: SolicitudEstado;
  asignacionId: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'cancel' | 'release' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    const motivo = prompt('Motivo de cancelación (opcional):') ?? undefined;
    if (motivo === null) return;
    if (!confirm('¿Cancelar definitivamente esta solicitud?')) return;
    setBusy('cancel');
    setError(null);
    try {
      await api.post(`/api/transport-requests/${id}/cancel`, motivo ? { motivo } : undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function liberar() {
    if (!asignacionId) return;
    if (!confirm('¿Liberar la asignación actual? La solicitud volverá a "pendiente".')) return;
    setBusy('release');
    setError(null);
    try {
      await api.post(`/api/assignments/${asignacionId}/release`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  const canAssign = estado === 'pendiente';
  const canRelease = estado === 'asignada' && asignacionId != null;
  const canCancel = estado !== 'completada' && estado !== 'cancelada';

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canAssign ? (
          <Link
            href={`/requests/${id}/assign`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Asignar camión
          </Link>
        ) : null}
        {canRelease ? (
          <button
            onClick={liberar}
            disabled={busy !== null}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'release' ? 'Liberando…' : 'Liberar asignación'}
          </button>
        ) : null}
        {canCancel ? (
          <button
            onClick={cancelar}
            disabled={busy !== null}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {busy === 'cancel' ? 'Cancelando…' : 'Cancelar solicitud'}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
