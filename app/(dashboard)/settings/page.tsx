import { Fuel, History, ShieldAlert } from 'lucide-react';
import { getFuelPrice, getFuelPriceHistory } from '@/lib/repositories/settings';
import { formatCurrency, formatDateTime } from '@/lib/client/format';
import { getCurrentUserPublic } from '@/lib/auth/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FuelPriceForm } from './FuelPriceForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [price, history, user] = await Promise.all([
    getFuelPrice(),
    getFuelPriceHistory(),
    getCurrentUserPublic(),
  ]);

  const isAdmin = user?.rol === 'admin';

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Parámetros globales del sistema. Los cambios sólo afectan a futuras asignaciones — las históricas conservan el precio aplicado al momento.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                Precio del combustible
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Valor actual: <strong className="text-foreground">{formatCurrency(price.amount, price.currency)} / L</strong>
              </p>
            </div>
            {!isAdmin ? (
              <Badge variant="warning" className="shrink-0">
                <ShieldAlert className="h-3 w-3" />
                Solo lectura
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <FuelPriceForm currentAmount={price.amount} currency={price.currency} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Sólo los usuarios con rol <strong className="text-foreground">admin</strong> pueden modificar este parámetro.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Historial de cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cambios registrados. El precio inicial se cargó con el seed.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Valor anterior</th>
                    <th className="px-4 py-2">Valor nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-2 text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
