'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Truck, Unlink, Ban, Play, CheckCircle2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { Button } from '@/components/ui/button';
import { ConfirmModal, PromptModal } from '@/components/Modal';
import type { SolicitudEstado } from '@/components/StatusChip';

type Action = 'cancel' | 'release' | 'start' | 'complete' | null;

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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  async function cancelar(motivo: string) {
    setBusy('cancel');
    try {
      await api.post(`/api/transport-requests/${id}/cancel`, motivo ? { motivo } : undefined);
      toast.success('Solicitud cancelada');
      router.refresh();
      setCancelOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function liberar() {
    if (!asignacionId) return;
    setBusy('release');
    try {
      await api.post(`/api/assignments/${asignacionId}/release`);
      toast.success('Asignación liberada');
      router.refresh();
      setReleaseOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function iniciar() {
    setBusy('start');
    try {
      await api.post(`/api/transport-requests/${id}/start`);
      toast.success('Viaje iniciado');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function completar() {
    setBusy('complete');
    try {
      await api.post(`/api/transport-requests/${id}/complete`);
      toast.success('Solicitud completada');
      router.refresh();
      setCompleteOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  const canEdit = estado === 'pendiente';
  const canAssign = estado === 'pendiente';
  const canStart = estado === 'asignada';
  const canComplete = estado === 'en_curso';
  const canRelease = estado === 'asignada' && asignacionId != null;
  const canCancel = estado !== 'completada' && estado !== 'cancelada';

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit ? (
        <Button asChild variant="outline">
          <Link href={`/requests/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        </Button>
      ) : null}
      {canAssign ? (
        <Button asChild>
          <Link href={`/requests/${id}/assign`}>
            <Truck className="h-4 w-4" />
            Asignar camión
          </Link>
        </Button>
      ) : null}
      {canStart ? (
        <Button disabled={busy !== null} onClick={iniciar}>
          {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Iniciar viaje
        </Button>
      ) : null}
      {canComplete ? (
        <Button disabled={busy !== null} onClick={() => setCompleteOpen(true)} className="bg-success text-success-foreground hover:bg-success/90">
          <CheckCircle2 className="h-4 w-4" />
          Marcar completada
        </Button>
      ) : null}
      {canRelease ? (
        <Button variant="outline" disabled={busy !== null} onClick={() => setReleaseOpen(true)}>
          <Unlink className="h-4 w-4" />
          Liberar asignación
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="ghost" disabled={busy !== null} onClick={() => setCancelOpen(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Ban className="h-4 w-4" />
          Cancelar
        </Button>
      ) : null}

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

      <ConfirmModal
        open={completeOpen}
        title="Marcar solicitud como completada"
        description="El viaje queda cerrado: la solicitud pasa a 'completada' y la asignación activa también. No se puede revertir."
        confirmLabel="Sí, completar"
        cancelLabel="Volver"
        onConfirm={completar}
        onClose={() => setCompleteOpen(false)}
      />
    </div>
  );
}
