'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Botón ícono discreto para recalcular la ruta de una solicitud.
 * Pensado para vivir al lado del label "Distancia" del detalle de solicitud,
 * no en el rack de acciones principales (que es para asignar/liberar/cancelar).
 */
export function RecalculateRouteButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function recalcular() {
    setBusy(true);
    try {
      const data = await api.post<{ distancia_km: number; is_approximate: boolean }>(
        `/api/transport-requests/${id}/recalculate-route`,
      );
      toast.success(
        data.is_approximate
          ? `Ruta aproximada: ${data.distancia_km} km`
          : `Ruta OSRM: ${data.distancia_km} km`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={recalcular}
            disabled={busy}
            aria-label="Recalcular ruta"
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-all',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50',
            )}
          >
            <RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Recalcular ruta</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
