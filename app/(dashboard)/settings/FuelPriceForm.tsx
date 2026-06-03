'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('El precio debe ser mayor a 0.');
      return;
    }
    setBusy(true);
    try {
      await api.put('/api/settings/fuel-price', { amount: value });
      toast.success('Precio actualizado');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fuel-price-amount">Nuevo precio ({currency} / L)</Label>
        <div className="flex gap-2">
          <Input
            id="fuel-price-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0.01}
            step={0.01}
            className="w-40"
            required
          />
          <Button type="submit" disabled={busy || Number(amount) === currentAmount}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? 'Guardando…' : 'Actualizar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
