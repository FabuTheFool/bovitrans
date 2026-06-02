'use client';

import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Modal accesible (role=dialog, aria-modal, focus trap mínimo).
 * Cierra con Escape, click en backdrop, o callback explícito.
 */
function BaseModal({ open, onClose, title, description, children }: BaseModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Mover el foco al diálogo al abrir.
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white shadow-xl outline-none"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          {description ? (
            <p id={descId} className="mt-1 text-sm text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual + intent. `danger` cambia el color del botón a rojo. */
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseModal open={open} onClose={busy ? () => {} : onClose} title={title} description={description}>
      {children ? <div className="mb-4 text-sm text-slate-700">{children}</div> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={clsx(
            'rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50',
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-brand-600 hover:bg-brand-700',
          )}
        >
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </BaseModal>
  );
}

interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  /** Recibe el texto ingresado (puede ser ''). */
  onConfirm: (value: string) => void | Promise<void>;
  onClose: () => void;
}

export function PromptModal({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseModal open={open} onClose={busy ? () => {} : onClose} title={title} description={description}>
      <div className="mb-4">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={clsx(
            'rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50',
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-brand-600 hover:bg-brand-700',
          )}
        >
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </BaseModal>
  );
}
