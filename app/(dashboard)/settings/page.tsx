import { getFuelPrice, getFuelPriceHistory } from '@/lib/repositories/settings';
import { formatCurrency, formatDateTime } from '@/lib/client/format';
import { FuelPriceForm } from './FuelPriceForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [price, history] = await Promise.all([
    getFuelPrice(),
    getFuelPriceHistory(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-600">
          Parámetros globales del sistema. Los cambios sólo afectan a futuras asignaciones —
          las históricas conservan el precio aplicado al momento.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Precio del combustible</h2>
        <p className="mt-1 text-sm text-slate-600">
          Valor actual: <strong>{formatCurrency(price.amount, price.currency)} / L</strong>
        </p>
        <FuelPriceForm currentAmount={price.amount} currency={price.currency} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Historial de cambios</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Sin cambios registrados. El precio inicial se cargó con el seed.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Valor anterior</th>
                  <th className="px-4 py-2">Valor nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {formatDateTime(h.changed_at)}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {h.valor_anterior
                        ? formatCurrency(h.valor_anterior.amount, h.valor_anterior.currency)
                        : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono font-semibold">
                      {formatCurrency(h.valor_nuevo.amount, h.valor_nuevo.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
