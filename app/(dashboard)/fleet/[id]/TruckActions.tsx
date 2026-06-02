'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';
import { ConfirmModal } from '@/components/Modal';

export function TruckActions({
  id,
  estado,
  asignacionesActivas,
}: {
  id: number;
  estado: 'activo' | 'inactivo';
  asignacionesActivas: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDeactivate = estado === 'activo';

  async function doToggle() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/trucks/${id}`, { estado: isDeactivate ? 'inactivo' : 'activo' });
      router.refresh();
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(false);
    }
  }

  function onClickToggle() {
    if (isDeactivate) {
      setConfirmOpen(true);
    } else {
      void doToggle();
    }
  }

  return (
    <div className="text-right">
      {asignacionesActivas > 0 ? (
        <p className="mb-1 text-xs text-amber-700">
          {asignacionesActivas} asignación{asignacionesActivas === 1 ? '' : 'es'} activa
          {asignacionesActivas === 1 ? '' : 's'}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onClickToggle}
        disabled={busy}
        className={
          isDeactivate
            ? 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
            : 'rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50'
        }
      >
        {busy ? 'Procesando…' : isDeactivate ? 'Dar de baja' : 'Reactivar'}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title="Dar de baja el camión"
        description="El camión queda inactivo y deja de aparecer en los selectores de asignación. Las asignaciones históricas se preservan."
        confirmLabel="Dar de baja"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={doToggle}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
