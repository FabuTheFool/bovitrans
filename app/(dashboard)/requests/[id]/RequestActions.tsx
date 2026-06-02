'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';
import { ConfirmModal, PromptModal } from '@/components/Modal';
import type { SolicitudEstado } from '@/components/StatusChip';

type Action = 'cancel' | 'release' | null;

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
  const [busy, setBusy] = useState<Action>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  async function cancelar(motivo: string) {
    setBusy('cancel');
    setError(null);
    try {
      await api.post(`/api/transport-requests/${id}/cancel`, motivo ? { motivo } : undefined);
      router.refresh();
      setCancelOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function liberar() {
    if (!asignacionId) return;
    setBusy('release');
    setError(null);
    try {
      await api.post(`/api/assignments/${asignacionId}/release`);
      router.refresh();
      setReleaseOpen(false);
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
            type="button"
            onClick={() => setReleaseOpen(true)}
            disabled={busy !== null}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Liberar asignación
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            disabled={busy !== null}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Cancelar solicitud
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}

      <PromptModal
        open={cancelOpen}
        title="Cancelar solicitud"
        description="Esta acción libera el camión asignado (si lo hubiera) y deja la solicitud en estado 'cancelada'. No es reversible."
        label="Motivo de cancelación (opcional)"
        placeholder="Ej. cliente reprogramó"
        confirmLabel="Cancelar solicitud"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={cancelar}
        onClose={() => setCancelOpen(false)}
      />

      <ConfirmModal
        open={releaseOpen}
        title="Liberar asignación"
        description="La asignación actual pasa a 'liberada' y la solicitud vuelve a 'pendiente'. El camión queda disponible."
        confirmLabel="Liberar"
        cancelLabel="Volver"
        onConfirm={liberar}
        onClose={() => setReleaseOpen(false)}
      />
    </div>
  );
}
