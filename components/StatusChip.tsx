import clsx from 'clsx';

const LABELS = {
  pendiente:  'Pendiente',
  asignada:   'Asignada',
  en_curso:   'En curso',
  completada: 'Completada',
  cancelada:  'Cancelada',
} as const;

const STYLES = {
  pendiente:  'bg-yellow-50  text-yellow-800  ring-yellow-200',
  asignada:   'bg-blue-50    text-blue-800    ring-blue-200',
  en_curso:   'bg-violet-50  text-violet-800  ring-violet-200',
  completada: 'bg-green-50   text-green-800   ring-green-200',
  cancelada:  'bg-slate-100  text-slate-700   ring-slate-200',
} as const;

export type SolicitudEstado = keyof typeof LABELS;

export function StatusChip({ status }: { status: SolicitudEstado }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[status],
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {LABELS[status]}
    </span>
  );
}
