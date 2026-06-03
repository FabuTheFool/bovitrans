'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Panel desplegable con atajos y gestos del panel principal.
 * Diseñado para ser discoverable pero discreto: el botón es chico y
 * vive en la esquina, sin gritar para ser tocado.
 */

interface Shortcut {
  keys: string[];
  desc: string;
}

interface ShortcutGroup {
  category: string;
  items: Shortcut[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'Selección',
    items: [
      { keys: ['Click'], desc: 'Seleccionar o deseleccionar una solicitud (en modo selección)' },
      { keys: ['Shift', '+', 'Click'], desc: 'Rango desde el último click hasta la card actual' },
      { keys: ['Drag'], desc: 'Selección rectangular en cualquier zona vacía' },
      { keys: ['Shift', '+', 'Drag'], desc: 'Sumar el rango sin perder lo ya seleccionado' },
      { keys: ['Click izq.', '+', 'Click der.'], desc: 'Toggle todas las del mismo estado de esa card' },
      { keys: ['Triple-click'], desc: 'Seleccionar todas (en zona vacía)' },
      { keys: ['Doble-click'], desc: 'En zona vacía limpia la selección. En una card sin selección activa, abre el detalle.' },
      { keys: ['Esc'], desc: 'Salir del modo selección y limpiar' },
    ],
  },
  {
    category: 'Acciones rápidas',
    items: [
      { keys: ['Hover sobre card pendiente'], desc: 'Aparece icono ✏ para editar sin pasar por el detalle' },
      { keys: ['Botón Recalcular'], desc: 'Re-consulta OSRM si la distancia parece desactualizada' },
    ],
  },
  {
    category: 'Teclado',
    items: [
      { keys: ['?'], desc: 'Abrir este panel desde cualquier lado' },
      { keys: ['Esc'], desc: 'Cerrar diálogos · Salir del modo selección' },
    ],
  },
];

export function ShortcutsHelp({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver atajos y gestos"
        title="Atajos"
        data-no-drag
        className={cn(
          'fixed bottom-4 right-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full',
          'border border-foreground/20 bg-card/70 text-muted-foreground shadow-lg backdrop-blur-md',
          'transition-all hover:scale-105 hover:border-primary/40 hover:bg-card hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Lightbulb className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Atajos y gestos del panel</DialogTitle>
                <DialogDescription>
                  Opcionales — la app funciona sin ellos. Si los conocés, te
                  movés más rápido.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {SHORTCUTS.map((group) => (
              <section key={group.category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.category}
                </h3>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {group.items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-1">
                        {item.keys.map((k, j) =>
                          k === '+' ? (
                            <span key={j} className="text-muted-foreground">+</span>
                          ) : (
                            <kbd
                              key={j}
                              className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
                            >
                              {k}
                            </kbd>
                          ),
                        )}
                      </div>
                      <p className="flex-1 text-right text-muted-foreground">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
