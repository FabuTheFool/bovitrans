import { Clock, CheckCircle2, Truck as TruckIcon, Route, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const META = {
  pendiente:  { label: 'Pendiente',  Icon: Clock,         classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20' },
  asignada:   { label: 'Asignada',   Icon: TruckIcon,     classes: 'bg-primary/10 text-primary ring-primary/20' },
  en_curso:   { label: 'En curso',   Icon: Route,         classes: 'bg-info/10 text-info ring-info/30' },
  completada: { label: 'Completada', Icon: CheckCircle2,  classes: 'bg-success/10 text-success ring-success/20' },
  cancelada:  { label: 'Cancelada',  Icon: Ban,           classes: 'bg-muted text-muted-foreground ring-border' },
} as const;

export type SolicitudEstado = keyof typeof META;

export function StatusChip({ status, className }: { status: SolicitudEstado; className?: string }) {
  const m = META[status];
  const Icon = m.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        m.classes,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {m.label}
    </span>
  );
}
