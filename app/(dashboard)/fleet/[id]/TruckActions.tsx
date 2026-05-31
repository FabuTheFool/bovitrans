'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';

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

  async function toggleEstado() {
    const target = estado === 'activo' ? 'inactivo' : 'activo';
    if (
      target === 'inactivo' &&
      !confirm(`¿Dar de baja el camión? Esto lo saca de los selectores de asignación.`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/trucks/${id}`, { estado: target });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError('Error inesperado.');
    } finally {
      setBusy(false);
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
        onClick={toggleEstado}
        disabled={busy}
        className={
          estado === 'activo'
            ? 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
            : 'rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50'
        }
      >
        {busy ? 'Procesando…' : estado === 'activo' ? 'Dar de baja' : 'Reactivar'}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
