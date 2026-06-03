import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { evaluarSobrecapacidad } from '@/lib/domain/capacity';

export function CapacityAlert({
  cabezas,
  capacidad,
}: {
  cabezas: number;
  capacidad: number;
}) {
  if (cabezas <= 0 || capacidad <= 0) return null;
  const evalCap = evaluarSobrecapacidad(cabezas, capacidad);

  if (!evalCap.excedida) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div>
          {evalCap.capacidadSobrante === 0 ? (
            <p className="text-success">Carga exacta — el camión queda al 100% de capacidad.</p>
          ) : (
            <p className="text-success">
              Capacidad OK — sobran <strong>{evalCap.capacidadSobrante} cabezas</strong> de margen.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="space-y-2">
          <p className="font-semibold text-destructive">
            Sobrecapacidad: {cabezas} cabezas exceden la capacidad de {capacidad}.
          </p>
          <p className="text-muted-foreground">
            El camión está <strong className="text-foreground">{evalCap.excedente} cabezas</strong> por sobre su capacidad máxima.
          </p>
          <ul className="space-y-1 pl-2">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-destructive" />
              <span><strong className="text-foreground">Opción A —</strong> dividir el traslado en <strong className="text-foreground">{evalCap.viajesNecesarios} viajes</strong> con este camión.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-destructive" />
              <span><strong className="text-foreground">Opción B —</strong> elegir otro camión con mayor capacidad (ver sugerencias debajo).</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Si confirmás la asignación así, quedará marcada con sobrecapacidad para auditoría.
          </p>
        </div>
      </div>
    </div>
  );
}
