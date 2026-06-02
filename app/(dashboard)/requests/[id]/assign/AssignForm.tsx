'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api, ApiClientError } from '@/lib/client/api-client';
import { calcularCostoCombustible } from '@/lib/domain/cost';
import { evaluarSobrecapacidad, sugerirCamionesAlternativos } from '@/lib/domain/capacity';
import { CapacityAlert } from '@/components/CapacityAlert';
import { ConfirmModal } from '@/components/Modal';
import { formatCurrency } from '@/lib/client/format';

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
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selected = camiones.find((c) => c.id === selectedId) ?? null;

  // Costo previsualizado (US-14).
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

  // Evaluación de capacidad (US-15).
  const capEval = useMemo(() => {
    if (!selected) return null;
    return evaluarSobrecapacidad(cabezas, selected.capacidad_max);
  }, [selected, cabezas]);

  // Camiones alternativos con capacidad suficiente.
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
    setError(null);
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
      router.push(`/requests/${solicitudId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Precio actual del combustible: <strong>{formatCurrency(precioLitro, currency)} / L</strong>.
        El costo se calcula como <code>distancia × consumo × precio</code> y se persiste como
        snapshot al confirmar.
      </p>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Seleccioná un camión ({camiones.length} disponibles)
        </p>
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
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={clsx(
                  'w-full rounded-lg border bg-white p-4 text-left shadow-sm transition',
                  isSelected
                    ? 'border-brand-600 ring-2 ring-brand-200'
                    : 'border-slate-200 hover:border-brand-300',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-base font-semibold text-slate-900">
                      {c.patente}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Capacidad {c.capacidad_max} cabezas · Consumo {c.consumo_l_km} L/Km
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">
                      {formatCurrency(cost, currency)}
                    </div>
                    <div
                      className={
                        evalCap.excedida
                          ? 'text-xs font-medium text-red-600'
                          : 'text-xs text-slate-500'
                      }
                    >
                      {evalCap.excedida
                        ? `⚠ sobrecapacidad (${evalCap.viajesNecesarios} viajes)`
                        : 'capacidad OK'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && capEval && costPreview ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Previsualización</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini label="Camión" value={selected.patente} mono />
            <Mini
              label="Costo combustible"
              value={formatCurrency(costPreview.costoTotal, currency)}
              big
            />
            <Mini
              label="Litros consumidos"
              value={`${costPreview.litrosConsumidos.toFixed(1)} L`}
            />
          </div>
          <CapacityAlert cabezas={cabezas} capacidad={selected.capacidad_max} />

          {capEval.excedida && alternativas.length > 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">Camiones con capacidad suficiente:</p>
              <ul className="mt-2 space-y-1">
                {alternativas.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className="text-brand-700 hover:underline"
                    >
                      {a.patente}
                    </button>{' '}
                    <span className="text-xs text-slate-500">
                      — capacidad {a.capacidadMax} ({a.capacidadMax - cabezas} de sobra)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onClickConfirmar}
          disabled={submitting || !selected}
          className={clsx(
            'rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition',
            capEval?.excedida
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-brand-600 hover:bg-brand-700',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {submitting
            ? 'Asignando…'
            : capEval?.excedida
              ? 'Asignar con sobrecapacidad'
              : 'Confirmar asignación'}
        </button>
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
            <li>La asignación quedará con <code>con_sobrecapacidad=true</code> en el registro.</li>
          </ul>
        ) : null}
      </ConfirmModal>
    </div>
  );
}

function Mini({
  label,
  value,
  mono,
  big,
}: {
  label: string;
  value: string;
  mono?: boolean;
  big?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={clsx(
          'mt-1 font-semibold text-slate-900',
          mono && 'font-mono',
          big ? 'text-xl' : 'text-base',
        )}
      >
        {value}
      </div>
    </div>
  );
}
