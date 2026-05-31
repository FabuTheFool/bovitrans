'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client/api-client';
import { CamionCreateSchema } from '@/lib/validators/truck';
import { normalizarPatente } from '@/lib/domain/patente';

export function TruckForm() {
  const router = useRouter();
  const [patente, setPatente] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [consumo, setConsumo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const normalizedPreview = patente ? normalizarPatente(patente) : '';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = CamionCreateSchema.safeParse({
      patente,
      capacidad_max: Number(capacidad),
      consumo_l_km: Number(consumo),
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fe[issue.path.join('.')] = issue.message;
      }
      setFieldErrors(fe);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/trucks', parsed.data);
      router.push('/fleet');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'CONFLICT') {
          setFieldErrors({ patente: 'Ya existe un camión con esta patente.' });
        } else {
          setError(err.message);
        }
      } else {
        setError('Error inesperado.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field
        label="Patente / Matrícula"
        hint={
          normalizedPreview && normalizedPreview !== patente
            ? `Se guardará normalizada como ${normalizedPreview}`
            : 'Se normaliza a mayúsculas, sin espacios. Debe ser única.'
        }
        error={fieldErrors.patente}
      >
        <input
          type="text"
          value={patente}
          onChange={(e) => setPatente(e.target.value)}
          placeholder="ABC1234"
          autoCapitalize="characters"
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono uppercase shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          required
        />
      </Field>

      <Field
        label="Capacidad máxima (cabezas)"
        hint="Cantidad máxima que el camión puede llevar de forma segura en un viaje."
        error={fieldErrors.capacidad_max}
      >
        <input
          type="number"
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
          min={1}
          step={1}
          placeholder="50"
          className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          required
        />
      </Field>

      <Field
        label="Consumo de combustible (L/Km)"
        hint="Litros consumidos por cada kilómetro recorrido. Ej: 0.45"
        error={fieldErrors.consumo_l_km}
      >
        <input
          type="number"
          value={consumo}
          onChange={(e) => setConsumo(e.target.value)}
          min={0.001}
          step={0.001}
          placeholder="0.450"
          className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          required
        />
      </Field>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Atención:</strong> patente, capacidad y consumo NO se pueden editar
        una vez creado el camión. Para corregir errores, dar de baja y registrar nuevo.
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Registrar camión'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </label>
  );
}
