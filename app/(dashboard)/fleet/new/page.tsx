import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TruckForm } from './TruckForm';

export default function NewTruckPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <Link
        href="/fleet"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a flota
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Registrar nuevo camión</h1>
        <p className="text-sm text-muted-foreground">
          Los datos críticos son inmutables una vez creados. Verificá los valores antes de guardar.
        </p>
      </div>
      <TruckForm />
    </div>
  );
}
