'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, X, Play, CheckCircle2, Ban, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { Button } from '@/components/ui/button';
import { RequestCard, type RequestCardData } from '@/components/RequestCard';
import { ConfirmModal, PromptModal } from '@/components/Modal';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { SearchBar, EMPTY_FILTERS, type AdvancedFilters } from '@/components/SearchBar';
import type { SolicitudEstado } from '@/components/StatusChip';
import { cn } from '@/lib/utils';

const ESTADOS: { value: SolicitudEstado | 'todas'; label: string }[] = [
  { value: 'todas',      label: 'Todas' },
  { value: 'pendiente',  label: 'Pendientes' },
  { value: 'asignada',   label: 'Asignadas' },
  { value: 'en_curso',   label: 'En curso' },
  { value: 'completada', label: 'Completadas' },
  { value: 'cancelada',  label: 'Canceladas' },
];

interface Marquee {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DRAG_THRESHOLD_PX = 4;

export function DashboardClient({
  solicitudes,
  counters,
}: {
  solicitudes: (RequestCardData & { estado: SolicitudEstado })[];
  counters: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtro = searchParams.get('estado') ?? 'todas';

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<null | 'start' | 'complete' | 'cancel'>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Búsqueda y filtros avanzados (client-side, instantáneo)
  const [searchQuery, setSearchQuery] = useState('');
  const [advFilters, setAdvFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);

  // Solicitudes visibles tras aplicar search + advanced filters
  const visibleSolicitudes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return solicitudes.filter((s) => {
      // Search query: matchea contra varios campos
      if (q) {
        const haystack = [
          s.solicitante_nombre,
          s.solicitante_contacto ?? '',
          s.origen_label,
          s.destino_label,
          s.camion_patente ?? '',
          String(s.id),
          `#${s.id}`,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Filtros avanzados
      if (advFilters.cabezasMin != null && s.cabezas < advFilters.cabezasMin) return false;
      if (advFilters.cabezasMax != null && s.cabezas > advFilters.cabezasMax) return false;
      if (advFilters.distanciaMin != null && (s.distancia_km == null || s.distancia_km < advFilters.distanciaMin)) return false;
      if (advFilters.distanciaMax != null && (s.distancia_km == null || s.distancia_km > advFilters.distanciaMax)) return false;
      if (advFilters.soloSobrecapacidad && !s.con_sobrecapacidad) return false;
      if (advFilters.soloSinAsignar && s.camion_patente) return false;
      if (advFilters.camionPatente?.trim()) {
        const patenteQ = advFilters.camionPatente.replace(/\s+/g, '').toUpperCase();
        if (!s.camion_patente || !s.camion_patente.replace(/\s+/g, '').toUpperCase().includes(patenteQ)) {
          return false;
        }
      }
      return true;
    });
  }, [solicitudes, searchQuery, advFilters]);

  // Marquee selection (drag rectangle) — coordenadas en VIEWPORT (clientX/Y)
  const dragStartRef = useRef<null | { x: number; y: number; shift: boolean; ctrl: boolean }>(null);
  const baseSelectionRef = useRef<Set<number>>(new Set());
  const dragOccurredRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  // Anchor para shift+click range selection (estilo file manager).
  // Apunta al último id donde el usuario hizo click "primario" (sin shift).
  const anchorRef = useRef<number | null>(null);

  // Estado de botones del mouse para detectar el chord left+right click
  // sobre una card → selecciona todas las solicitudes del mismo estado.
  const leftDownRef = useRef(false);
  const rightDownRef = useRef(false);
  const chordHandledRef = useRef(false);

  // Al salir del modo selección, limpia
  useEffect(() => { if (!selectMode) setSelected(new Set()); }, [selectMode]);

  const selectedRequests = useMemo(
    () => solicitudes.filter((s) => selected.has(s.id)),
    [solicitudes, selected],
  );

  const allSameState = useMemo(() => {
    if (selectedRequests.length === 0) return null;
    const first = selectedRequests[0].estado;
    return selectedRequests.every((s) => s.estado === first) ? first : null;
  }, [selectedRequests]);

  const canBulkStart    = allSameState === 'asignada';
  const canBulkComplete = allSameState === 'en_curso';
  const canBulkCancel   = selectedRequests.length > 0 && selectedRequests.every((s) => s.estado !== 'completada' && s.estado !== 'cancelada');

  function toggle(id: number, shift = false) {
    // Shift+click: range selection desde el anchor hasta el clickeado.
    // Sigue el orden visual (= orden del array de solicitudes).
    if (shift && anchorRef.current != null && anchorRef.current !== id) {
      const idxAnchor = solicitudes.findIndex((s) => s.id === anchorRef.current);
      const idxTarget = solicitudes.findIndex((s) => s.id === id);
      if (idxAnchor !== -1 && idxTarget !== -1) {
        const [start, end] =
          idxAnchor < idxTarget ? [idxAnchor, idxTarget] : [idxTarget, idxAnchor];
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) next.add(solicitudes[i].id);
          return next;
        });
        // El anchor NO se actualiza con shift+click — se mantiene en el
        // primer click "primario", para permitir extender el rango.
        return;
      }
    }

    // Click normal (o ctrl+click): toggle del id. Actualiza el anchor.
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    anchorRef.current = id;
  }

  function selectAll() {
    setSelected(new Set(solicitudes.map((s) => s.id)));
    if (!selectMode) setSelectMode(true);
  }

  /**
   * Toggle por estado. Trigger: left+right click chord sobre una card.
   *
   * - Si NO todas las del mismo estado están seleccionadas → suma las que faltan
   * - Si TODAS las del mismo estado ya están seleccionadas → las quita
   *
   * Esto permite componer mezclas de estados (chord pendiente + chord asignada
   * → ambos estados seleccionados) y deshacer una categoría sin perder las otras
   * (chord pendiente otra vez → solo se van los pendientes, queda asignada).
   */
  function selectAllSameState(cardId: number) {
    const card = solicitudes.find((s) => s.id === cardId);
    if (!card) return;
    const ids = solicitudes.filter((s) => s.estado === card.estado).map((s) => s.id);
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
    if (!selectMode) setSelectMode(true);
  }

  async function bulkAction(action: 'start' | 'complete' | 'cancel', motivo?: string) {
    setBusy(action);
    try {
      const data = await api.post<{ accepted: number[]; rejected: { id: number; reason: string }[] }>(
        '/api/transport-requests/bulk-transition',
        { ids: Array.from(selected), action, motivo },
      );
      const label = action === 'start' ? 'iniciadas' : action === 'complete' ? 'completadas' : 'canceladas';
      if (data.accepted.length > 0) {
        toast.success(`${data.accepted.length} solicitudes ${label}${data.rejected.length > 0 ? ` · ${data.rejected.length} rechazadas` : ''}`);
      } else {
        toast.error('Ninguna solicitud cumplía las condiciones.');
      }
      setSelectMode(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
      setCompleteOpen(false);
      setCancelOpen(false);
    }
  }

  /**
   * Doble click en zona vacía → deselecciona todo. Sólo si NO cae sobre una card.
   */
  useEffect(() => {
    function handleDblClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Sólo en zonas válidas de la página (no en sidebar, ni en data-no-drag)
      if (target.closest('aside, [data-no-drag], input, textarea')) return;
      if (target.closest('[data-request-id]')) return;
      setSelected(new Set());
    }
    document.addEventListener('dblclick', handleDblClick);
    return () => document.removeEventListener('dblclick', handleDblClick);
  }, []);

  // ─── Marquee selection (drag rectangle) GLOBAL ────────────────────────────
  // Listener global en document: el drag funciona en CUALQUIER parte del viewport
  // excepto el sidebar (aside) y elementos marcados con data-no-drag.
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      // Track button state para detectar chord (left + right)
      if (e.button === 0) leftDownRef.current = true;
      if (e.button === 2) rightDownRef.current = true;

      const target = e.target as HTMLElement;
      const cardEl = target.closest<HTMLElement>('[data-request-id]');
      const cardId = cardEl ? Number(cardEl.getAttribute('data-request-id')) : null;

      // Chord left+right sobre una card → select all same state.
      if (leftDownRef.current && rightDownRef.current && cardId != null && Number.isFinite(cardId)) {
        e.preventDefault();
        e.stopPropagation();
        selectAllSameState(cardId);
        chordHandledRef.current = true;
        suppressNextClickRef.current = true;
        // Reset para no re-disparar hasta que se suelten ambos botones
        return;
      }

      if (e.button !== 0) return; // resto del handler solo para left

      // Zonas excluidas para el drag
      if (target.closest('aside, [data-no-drag], input, textarea')) return;

      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
      };
      baseSelectionRef.current = (e.shiftKey || e.ctrlKey || e.metaKey) ? new Set(selected) : new Set();
      dragOccurredRef.current = false;
    }

    function handleMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Esperar a superar el threshold para iniciar marquee
      if (!marquee && distance < DRAG_THRESHOLD_PX) return;

      // Marcar que efectivamente hubo arrastre (para suprimir el click posterior)
      dragOccurredRef.current = true;

      // Actualizar/iniciar marquee (coords del viewport, position:fixed)
      setMarquee({
        startX: dragStartRef.current.x,
        startY: dragStartRef.current.y,
        endX: x,
        endY: y,
      });

      // Calcular bounding box del marquee (viewport coords)
      const x1 = Math.min(dragStartRef.current.x, x);
      const y1 = Math.min(dragStartRef.current.y, y);
      const x2 = Math.max(dragStartRef.current.x, x);
      const y2 = Math.max(dragStartRef.current.y, y);

      // Encontrar cards intersectadas (también viewport coords)
      const cardEls = document.querySelectorAll<HTMLElement>('[data-request-id]');
      const inMarquee = new Set<number>();
      cardEls.forEach((el) => {
        const cardRect = el.getBoundingClientRect();
        if (cardRect.right >= x1 && cardRect.left <= x2 && cardRect.bottom >= y1 && cardRect.top <= y2) {
          const id = Number(el.getAttribute('data-request-id'));
          if (Number.isFinite(id)) inMarquee.add(id);
        }
      });

      // Combinar con la selección base (shift/ctrl) o reemplazar
      const next = new Set([...baseSelectionRef.current, ...inMarquee]);
      setSelected(next);

      // Auto-entrar a modo selección si capturó algo
      if (inMarquee.size > 0 && !selectMode) setSelectMode(true);
    }

    function handleUp(e: MouseEvent) {
      // Liberar estado de buttons del chord
      if (e.button === 0) leftDownRef.current = false;
      if (e.button === 2) rightDownRef.current = false;

      // Si efectivamente hubo arrastre, suprimir el click sintético que el
      // browser emite a continuación (evita que la card abra el detalle).
      if (dragOccurredRef.current) {
        suppressNextClickRef.current = true;
        setTimeout(() => { suppressNextClickRef.current = false; }, 50);
      }
      dragStartRef.current = null;
      dragOccurredRef.current = false;
      setMarquee(null);
    }

    function handleClickCapture(e: MouseEvent) {
      if (suppressNextClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClickRef.current = false;
      }
    }

    /**
     * Right-click sobre una card: preventDefault del context menu nativo.
     * Combinado con left-click rapido completa el chord (en handleDown).
     */
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-request-id]') || chordHandledRef.current) {
        e.preventDefault();
        chordHandledRef.current = false;
      }
    }

    /**
     * Triple-click en zona vacía válida → seleccionar todas las solicitudes.
     */
    function handleTripleClick(e: MouseEvent) {
      if (e.detail !== 3) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-request-id]')) return; // no si cae sobre una card
      if (target.closest('aside, [data-no-drag], input, textarea')) return;
      selectAll();
    }

    function handleKey(e: KeyboardEvent) {
      // ESC sale del modo selección
      if (e.key === 'Escape') {
        setSelectMode(false);
        setSelected(new Set());
        setMarquee(null);
        dragStartRef.current = null;
      }
      // ? abre el panel de atajos (si no estás tipeando en un input)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutsOpen((v) => !v);
        }
      }
    }

    document.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('keydown', handleKey);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleTripleClick);
    // Capture phase para que el click se intercepte ANTES que llegue al link
    window.addEventListener('click', handleClickCapture, true);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleTripleClick);
      window.removeEventListener('click', handleClickCapture, true);
    };
  }, [marquee, selectMode, selected, solicitudes]);

  return (
    <div className="flex flex-1 animate-fade-in flex-col gap-6 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4" data-no-drag>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Panel principal</h1>
          <p className="text-sm text-muted-foreground">
            {counters.todas ?? 0} solicitudes en total · {counters.pendiente ?? 0} pendientes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectMode((v) => !v)}
            size="lg"
            className="border border-foreground/30 bg-background/40 backdrop-blur-md hover:bg-muted/60"
          >
            {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectMode ? 'Salir de selección' : 'Seleccionar'}
          </Button>
          <Button asChild size="lg">
            <Link href="/requests/new">
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Link>
          </Button>
        </div>
      </header>

      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        filters={advFilters}
        onFiltersChange={setAdvFilters}
        totalCount={solicitudes.length}
        filteredCount={visibleSolicitudes.length}
      />

      <nav aria-label="Filtros por estado" className="glass flex flex-wrap gap-1.5 rounded-xl p-1.5" data-no-drag>
        {ESTADOS.map((e) => {
          const active = filtro === e.value;
          const count = counters[e.value] ?? 0;
          return (
            <Link
              key={e.value}
              href={e.value === 'todas' ? '/' : `/?estado=${e.value}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {e.label}
              <span className={cn('rounded-full px-1.5 text-xs font-semibold', active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground')}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {selectMode && solicitudes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" data-no-drag>
          <span className="text-muted-foreground">
            {selected.size} de {solicitudes.length} seleccionadas <span className="hidden sm:inline opacity-70">· Tip: arrastrá en el espacio vacío para selección múltiple</span>
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={selectAll}>Seleccionar todas</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpiar</Button>
          </div>
        </div>
      ) : null}

      {/* Grid o EmptyState — el drag funciona globalmente, no necesita wrapper */}
      <div className={cn(marquee && 'select-none')}>
        {visibleSolicitudes.length === 0 ? (
          searchQuery || Object.values(advFilters).some((v) => v !== undefined && v !== false && v !== '') ? (
            <NoResultsState
              onReset={() => {
                setSearchQuery('');
                setAdvFilters(EMPTY_FILTERS);
              }}
            />
          ) : (
            <EmptyState filtro={filtro} />
          )
        ) : (
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleSolicitudes.map((s, i) => (
                <motion.div
                  key={s.id}
                  data-request-id={s.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.22,
                    delay: Math.min(i * 0.015, 0.15),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <SelectableCard
                    req={s}
                    selectMode={selectMode}
                    selected={selected.has(s.id)}
                    onToggle={(e) => toggle(s.id, e.shiftKey)}
                    onDoubleOpen={() => {
                      if (selected.size === 0) router.push(`/requests/${s.id}`);
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Marquee overlay — position:fixed para que sea full viewport */}
      {marquee ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[2000] rounded-md border-2 border-primary bg-primary/15"
          style={{
            left: Math.min(marquee.startX, marquee.endX),
            top: Math.min(marquee.startY, marquee.endY),
            width: Math.abs(marquee.endX - marquee.startX),
            height: Math.abs(marquee.endY - marquee.startY),
          }}
        />
      ) : null}

      {/* Floating action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl"
            data-no-drag
          >
            <div className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 shadow-2xl">
              <div className="text-sm">
                <strong>{selected.size}</strong> seleccionada{selected.size === 1 ? '' : 's'}
                {!allSameState ? (
                  <span className="ml-2 text-xs text-warning">· estados mezclados</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {canBulkStart ? (
                  <Button size="sm" disabled={busy !== null} onClick={() => bulkAction('start')}>
                    <Play className="h-3.5 w-3.5" />
                    Iniciar {selected.size}
                  </Button>
                ) : null}
                {canBulkComplete ? (
                  <Button size="sm" disabled={busy !== null} onClick={() => setCompleteOpen(true)} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completar {selected.size}
                  </Button>
                ) : null}
                {canBulkCancel ? (
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setCancelOpen(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Ban className="h-3.5 w-3.5" />
                    Cancelar {selected.size}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmModal
        open={completeOpen}
        title={`Completar ${selected.size} solicitudes`}
        description="Las solicitudes pasan a 'completada' y sus asignaciones activas se cierran. No se puede revertir."
        confirmLabel="Sí, completar"
        cancelLabel="Volver"
        onConfirm={() => bulkAction('complete')}
        onClose={() => setCompleteOpen(false)}
      />

      <PromptModal
        open={cancelOpen}
        title={`Cancelar ${selected.size} solicitudes`}
        description="Cada solicitud queda 'cancelada' y se libera el camión asignado si lo tiene. No se puede revertir."
        label="Motivo de cancelación (opcional)"
        placeholder="Ej. reprogramación de cliente"
        confirmLabel="Cancelar seleccionadas"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={(motivo) => bulkAction('cancel', motivo)}
        onClose={() => setCancelOpen(false)}
      />

      {/* Botón flotante de atajos: discreto en la esquina, descubrible solo si se busca */}
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function SelectableCard({
  req,
  selectMode,
  selected,
  onToggle,
  onDoubleOpen,
}: {
  req: RequestCardData;
  selectMode: boolean;
  selected: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDoubleOpen: () => void;
}) {
  if (!selectMode) return <RequestCard req={req} />;

  return (
    <button
      type="button"
      onClick={onToggle}
      onDoubleClick={onDoubleOpen}
      aria-pressed={selected}
      className={cn(
        'relative block w-full rounded-xl text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {/* Indicador de selección flotando en la esquina superior izquierda
          del card (fuera del padding), evitando overlap con el StatusChip
          que vive en el top-right del content. */}
      <div className="absolute -left-2 -top-2 z-10">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-md transition-colors',
            selected ? 'bg-primary text-primary-foreground' : 'bg-card',
          )}
        >
          {selected ? <CheckSquare className="h-3 w-3" /> : null}
        </div>
      </div>
      <div className="pointer-events-none">
        <RequestCard req={req} />
      </div>
    </button>
  );
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center animate-fade-in">
      <h2 className="font-semibold tracking-tight">Sin resultados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ninguna solicitud coincide con la búsqueda o los filtros aplicados.
      </p>
      <div className="mt-5">
        <Button variant="outline" onClick={onReset}>
          Limpiar búsqueda y filtros
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ filtro }: { filtro: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center animate-fade-in">
      <h2 className="font-semibold tracking-tight">
        {filtro === 'todas' ? 'Aún no hay solicitudes registradas' : `Sin solicitudes en estado "${filtro}"`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtro === 'todas' ? 'Cargá la primera solicitud para empezar a operar.' : 'Probá cambiar el filtro o crear una nueva solicitud.'}
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="h-4 w-4" />
            Crear solicitud
          </Link>
        </Button>
      </div>
    </div>
  );
}
