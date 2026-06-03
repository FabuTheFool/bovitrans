'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Filtros avanzados opcionales. Todos los campos undefined = sin filtro.
 */
export interface AdvancedFilters {
  cabezasMin?: number;
  cabezasMax?: number;
  distanciaMin?: number;
  distanciaMax?: number;
  soloSobrecapacidad?: boolean;
  soloSinAsignar?: boolean;
  camionPatente?: string;
}

export const EMPTY_FILTERS: AdvancedFilters = {};

export function countActiveFilters(f: AdvancedFilters): number {
  return (
    (f.cabezasMin != null ? 1 : 0) +
    (f.cabezasMax != null ? 1 : 0) +
    (f.distanciaMin != null ? 1 : 0) +
    (f.distanciaMax != null ? 1 : 0) +
    (f.soloSobrecapacidad ? 1 : 0) +
    (f.soloSinAsignar ? 1 : 0) +
    (f.camionPatente?.trim() ? 1 : 0)
  );
}

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  filters: AdvancedFilters;
  onFiltersChange: (f: AdvancedFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export function SearchBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const advFilterCount = countActiveFilters(filters);
  const hasFilters = advFilterCount > 0 || query.trim().length > 0;

  // Cerrar popover al click afuera
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function resetAll() {
    onQueryChange('');
    onFiltersChange(EMPTY_FILTERS);
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2" data-no-drag>
      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por nombre, contacto, patente, lugar o #id…"
          className="pl-9 pr-10"
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Botón de búsqueda avanzada con badge de filtros activos */}
      <div className="relative" ref={popoverRef}>
        <Button
          variant="outline"
          size="default"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'relative border border-foreground/30 bg-background/40 backdrop-blur-md hover:bg-muted/60',
            open && 'ring-2 ring-ring',
          )}
          aria-label="Filtros avanzados"
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {advFilterCount > 0 ? (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {advFilterCount}
            </span>
          ) : null}
        </Button>

        {open ? (
          <AdvancedFiltersPopover
            filters={filters}
            onChange={onFiltersChange}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>

      {hasFilters ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetear
          </Button>
          <span className="text-xs text-muted-foreground">
            {filteredCount} de {totalCount}
          </span>
        </>
      ) : null}
    </div>
  );
}

function AdvancedFiltersPopover({
  filters,
  onChange,
  onClose,
}: {
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
  onClose: () => void;
}) {
  // Estado local del popover para editar sin disparar re-renders
  const [draft, setDraft] = useState<AdvancedFilters>(filters);

  function apply() {
    onChange(draft);
    onClose();
  }
  function clear() {
    setDraft(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[22rem] rounded-xl border border-border bg-popover p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros avanzados</h3>
        <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
          Limpiar
        </Button>
      </div>

      <div className="space-y-4">
        <RangeField
          label="Cabezas"
          min={draft.cabezasMin}
          max={draft.cabezasMax}
          onMinChange={(v) => setDraft({ ...draft, cabezasMin: v })}
          onMaxChange={(v) => setDraft({ ...draft, cabezasMax: v })}
          step={1}
          unit="cabezas"
        />
        <RangeField
          label="Distancia (km)"
          min={draft.distanciaMin}
          max={draft.distanciaMax}
          onMinChange={(v) => setDraft({ ...draft, distanciaMin: v })}
          onMaxChange={(v) => setDraft({ ...draft, distanciaMax: v })}
          step={10}
          unit="km"
        />

        <div className="space-y-2">
          <Label htmlFor="adv-camion">Camión asignado</Label>
          <Input
            id="adv-camion"
            type="text"
            value={draft.camionPatente ?? ''}
            onChange={(e) => setDraft({ ...draft, camionPatente: e.target.value })}
            placeholder="Patente exacta o parcial"
            autoCapitalize="characters"
            className="font-mono uppercase"
          />
        </div>

        <div className="space-y-2">
          <Toggle
            label="Solo con sobrecapacidad"
            checked={!!draft.soloSobrecapacidad}
            onChange={(v) => setDraft({ ...draft, soloSobrecapacidad: v })}
          />
          <Toggle
            label="Solo sin camión asignado"
            checked={!!draft.soloSinAsignar}
            onChange={(v) => setDraft({ ...draft, soloSinAsignar: v })}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" onClick={apply}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

function RangeField({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  step,
  unit,
}: {
  label: string;
  min?: number;
  max?: number;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  step: number;
  unit: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} <span className="ml-1 text-xs text-muted-foreground">({unit})</span>
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          step={step}
          placeholder="Mín"
          value={min ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onMinChange(v === '' ? undefined : Number(v));
          }}
        />
        <Input
          type="number"
          min={0}
          step={step}
          placeholder="Máx"
          value={max ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onMaxChange(v === '' ? undefined : Number(v));
          }}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-card p-2.5 text-sm transition-colors hover:bg-muted/50">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-[1.125rem]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  );
}
