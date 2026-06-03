'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Truck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { CamionCreateSchema } from '@/lib/validators/truck';
import { normalizarPatente } from '@/lib/domain/patente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function TruckForm() {
  const router = useRouter();
  const [patente, setPatente] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [consumo, setConsumo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const ids = {
    patente: useId(),
    capacidad: useId(),
    consumo: useId(),
  };

  const normalizedPreview = patente ? normalizarPatente(patente) : '';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
      toast.success(`Camión ${parsed.data.patente.toUpperCase()} registrado`);
      router.push('/fleet');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'CONFLICT') {
          setFieldErrors({ patente: 'Ya existe un camión con esta patente.' });
          toast.error('Patente duplicada');
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('Error inesperado.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          id={ids.patente}
          label="Patente / Matrícula"
          hint={
            normalizedPreview && normalizedPreview !== patente
              ? `Se guardará normalizada como ${normalizedPreview}`
              : 'Se normaliza a mayúsculas, sin espacios. Debe ser única.'
          }
          error={fieldErrors.patente}
        >
          <Input
            id={ids.patente}
            type="text"
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
            placeholder="ABC1234"
            autoCapitalize="characters"
            aria-invalid={!!fieldErrors.patente}
            aria-describedby={`${ids.patente}-msg`}
            className="font-mono uppercase"
            required
          />
        </Field>

        <Field
          id={ids.capacidad}
          label="Capacidad máxima (cabezas)"
          hint="Cantidad máxima que el camión puede llevar en un viaje."
          error={fieldErrors.capacidad_max}
        >
          <Input
            id={ids.capacidad}
            type="number"
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            min={1}
            step={1}
            placeholder="50"
            aria-invalid={!!fieldErrors.capacidad_max}
            aria-describedby={`${ids.capacidad}-msg`}
            required
          />
        </Field>

        <Field
          id={ids.consumo}
          label="Consumo de combustible (L/Km)"
          hint="Litros consumidos por cada kilómetro recorrido. Ej: 0.45"
          error={fieldErrors.consumo_l_km}
        >
          <Input
            id={ids.consumo}
            type="number"
            value={consumo}
            onChange={(e) => setConsumo(e.target.value)}
            min={0.001}
            step={0.001}
            placeholder="0.450"
            aria-invalid={!!fieldErrors.consumo_l_km}
            aria-describedby={`${ids.consumo}-msg`}
            required
          />
        </Field>

        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-foreground">
            <strong>Atención:</strong> patente, capacidad y consumo no se pueden editar una vez creado el camión.
            Para corregir errores, hay que dar de baja y registrar nuevo.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            {submitting ? 'Guardando…' : 'Registrar camión'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
