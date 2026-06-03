'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Truck as TruckIcon, AlertTriangle, ChevronRight, Loader2, Coins, Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { calcularCostoCombustible } from '@/lib/domain/cost';
import { evaluarSobrecapacidad, sugerirCamionesAlternativos } from '@/lib/domain/capacity';
import { CapacityAlert } from '@/components/CapacityAlert';
import { ConfirmModal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/client/format';
import { cn } from '@/lib/utils';

interface Camion {
  id: number;
  patente: string;
  capacidad_max: number;
  consumo_l_km: number;
}

export function AssignForm({
  solicitudId,
  cabezas,
  distanciaKm,
  camiones,
  precioLitro,
  currency,
}: {
  solicitudId: number;
  cabezas: number;
  distanciaKm: number;
  camiones: Camion[];
  precioLitro: number;
  currency: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selected = camiones.find((c) => c.id === selectedId) ?? null;

  const costPreview = useMemo(() => {
    if (!selected) return null;
    try {
      return calcularCostoCombustible({
        distanciaKm,
        consumoLKm: selected.consumo_l_km,
        precioLitro,
      });
    } catch {
      return null;
    }
  }, [selected, distanciaKm, precioLitro]);

  const capEval = useMemo(() => {
    if (!selected) return null;
    return evaluarSobrecapacidad(cabezas, selected.capacidad_max);
  }, [selected, cabezas]);

  const alternativas = useMemo(() => {
    if (!capEval?.excedida) return [];
    return sugerirCamionesAlternativos(
      cabezas,
      camiones.map((c) => ({
        id: c.id,
        patente: c.patente,
        capacidadMax: c.capacidad_max,
        consumoLKm: c.consumo_l_km,
      })),
    );
  }, [capEval, cabezas, camiones]);

  function onClickConfirmar() {
    if (!selected) return;
    if (capEval?.excedida) {
      setConfirmOpen(true);
    } else {
      void doAssign();
    }
  }

  async function doAssign() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/api/assignments', {
        solicitud_id: solicitudId,
        camion_id: selected.id,
        acepta_sobrecapacidad: capEval?.excedida ?? false,
      });
      toast.success(`Camión ${selected.patente} asignado`);
      router.push(`/requests/${solicitudId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Precio actual del combustible: <strong className="text-foreground">{formatCurrency(precioLitro, currency)} / L</strong>.
          El costo se calcula como <code className="rounded bg-muted px-1 text-xs">distancia × consumo × precio</code> y se persiste como snapshot al confirmar.
        </p>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-medium">Seleccioná un camión <span className="text-muted-foreground">({camiones.length} disponibles)</span></p>
        <div className="space-y-2">
          {camiones.map((c) => {
            const evalCap = evaluarSobrecapacidad(cabezas, c.capacidad_max);
            const cost = calcularCostoCombustible({
              distanciaKm,
              consumoLKm: c.consumo_l_km,
              precioLitro,
            }).costoTotal;
            const isSelected = selectedId === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isSelected ? <Check className="h-5 w-5" /> : <TruckIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-mono text-base font-semibold">{c.patente}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Capacidad {c.capacidad_max} cabezas · Consumo {c.consumo_l_km} L/Km
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tracking-tight">
                      {formatCurrency(cost, currency)}
                    </div>
                    <div
                      className={cn(
                        'mt-0.5 text-xs',
                        evalCap.excedida ? 'font-medium text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {evalCap.excedida
                        ? `Sobrecapacidad (${evalCap.viajesNecesarios} viajes)`
                        : 'capacidad OK'}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {selected && capEval && costPreview ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4 rounded-xl border border-border bg-muted/40 p-4"
        >
          <h3 className="text-sm font-semibold tracking-tight">Previsualización</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat icon={<TruckIcon className="h-3.5 w-3.5" />} label="Camión" value={selected.patente} mono />
            <MiniStat icon={<Coins className="h-3.5 w-3.5" />} label="Costo combustible" value={formatCurrency(costPreview.costoTotal, currency)} big />
            <MiniStat icon={<Droplet className="h-3.5 w-3.5" />} label="Litros consumidos" value={`${costPreview.litrosConsumidos.toFixed(1)} L`} />
          </div>
          <CapacityAlert cabezas={cabezas} capacidad={selected.capacidad_max} />

          {capEval.excedida && alternativas.length > 0 ? (
            <Card className="p-3">
              <p className="text-sm font-medium">Camiones con capacidad suficiente:</p>
              <ul className="mt-2 space-y-1">
                {alternativas.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:underline"
                    >
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-mono font-medium">{a.patente}</span>
                    </button>
                    <span className="ml-1 text-xs text-muted-foreground">
                      — capacidad {a.capacidadMax} ({a.capacidadMax - cabezas} de sobra)
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </motion.section>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onClickConfirmar}
          disabled={submitting || !selected}
          variant={capEval?.excedida ? 'destructive' : 'default'}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : capEval?.excedida ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {submitting
            ? 'Asignando…'
            : capEval?.excedida
              ? 'Asignar con sobrecapacidad'
              : 'Confirmar asignación'}
        </Button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar asignación con sobrecapacidad"
        description={
          selected && capEval
            ? `El camión ${selected.patente} tiene capacidad ${selected.capacidad_max} y la carga es ${cabezas}. La asignación quedará marcada con sobrecapacidad para auditoría.`
            : undefined
        }
        confirmLabel="Sí, asumir el riesgo"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={doAssign}
        onClose={() => setConfirmOpen(false)}
      >
        {capEval ? (
          <ul className="list-disc space-y-1 pl-5 text-xs">
            <li>Excedente: <strong>{capEval.excedente} cabezas</strong></li>
            <li>Viajes necesarios (si se respeta capacidad): <strong>{capEval.viajesNecesarios}</strong></li>
            <li>La asignación quedará con <code className="rounded bg-muted px-1">con_sobrecapacidad=true</code>.</li>
          </ul>
        ) : null}
      </ConfirmModal>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  mono,
  big,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  big?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('mt-1 font-semibold', mono && 'font-mono', big ? 'text-xl tracking-tight' : 'text-base')}>
        {value}
      </div>
    </Card>
  );
}
