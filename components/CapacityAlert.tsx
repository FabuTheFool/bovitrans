import { evaluarSobrecapacidad } from '@/lib/domain/capacity';

/**
 * Banner de alerta de capacidad. Visual escalonado:
 *  - ok    → no se muestra
 *  - exact → muestra info verde "ajuste exacto"
 *  - over  → muestra rojo con sugerencia de viajes o reasignación
 */
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
    if (evalCap.capacidadSobrante === 0) {
      return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          ✓ Carga exacta — el camión queda al 100% de capacidad.
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        ✓ Capacidad OK — sobran {evalCap.capacidadSobrante} cabezas de margen.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <div className="flex items-center gap-2 font-semibold">
        <span aria-hidden>⚠</span>
        Sobrecapacidad: {cabezas} cabezas exceden la capacidad de {capacidad}.
      </div>
      <p className="mt-1">
        El camión está {evalCap.excedente} cabezas por sobre su capacidad máxima.
      </p>
      <ul className="mt-2 list-disc pl-5">
        <li>
          <strong>Opción A —</strong> dividir el traslado en{' '}
          <strong>{evalCap.viajesNecesarios} viajes</strong> con este camión.
        </li>
        <li>
          <strong>Opción B —</strong> seleccionar otro camión con mayor capacidad
          (ver sugerencias debajo).
        </li>
      </ul>
      <p className="mt-2 text-xs">
        Si confirmás la asignación así, quedará marcada con sobrecapacidad para auditoría.
      </p>
    </div>
  );
}
