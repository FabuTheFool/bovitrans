'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';

export function FuelPriceForm({
  currentAmount,
  currency,
}: {
  currentAmount: number;
  currency: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentAmount.toString());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFeedback({ kind: 'err', msg: 'El precio debe ser mayor a 0.' });
      return;
    }
    setBusy(true);
    try {
      await api.put('/api/settings/fuel-price', { amount: value });
      setFeedback({ kind: 'ok', msg: 'Precio actualizado.' });
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: 'err',
        msg: err instanceof ApiClientError ? err.message : 'Error inesperado.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Nuevo precio ({currency} / L)</span>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            required
          />
          <button
            type="submit"
            disabled={busy || Number(amount) === currentAmount}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Actualizar'}
          </button>
        </div>
      </label>
      {feedback ? (
        <p
          className={
            feedback.kind === 'ok'
              ? 'text-sm text-green-700'
              : 'text-sm text-red-600'
          }
        >
          {feedback.msg}
        </p>
      ) : null}
    </form>
  );
}
