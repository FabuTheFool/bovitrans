'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Power, PowerOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { Button } from '@/components/ui/button';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDeactivate = estado === 'activo';

  async function doToggle() {
    setBusy(true);
    try {
      await api.patch(`/api/trucks/${id}`, { estado: isDeactivate ? 'inactivo' : 'activo' });
      toast.success(isDeactivate ? 'Camión dado de baja' : 'Camión reactivado');
      router.refresh();
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
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
    <div className="flex flex-col items-end gap-1">
      {asignacionesActivas > 0 ? (
        <p className="text-xs text-warning">
          {asignacionesActivas} asignación{asignacionesActivas === 1 ? '' : 'es'} activa
          {asignacionesActivas === 1 ? '' : 's'}
        </p>
      ) : null}
      <Button
        type="button"
        variant={isDeactivate ? 'outline' : 'default'}
        onClick={onClickToggle}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isDeactivate ? (
          <PowerOff className="h-4 w-4" />
        ) : (
          <Power className="h-4 w-4" />
        )}
        {busy ? 'Procesando…' : isDeactivate ? 'Dar de baja' : 'Reactivar'}
      </Button>

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
