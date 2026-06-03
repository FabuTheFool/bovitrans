import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewRequestForm } from './NewRequestForm';

export default function NewRequestPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Nueva solicitud</h1>
        <p className="text-sm text-muted-foreground">
          Cargá los datos del cliente y el trayecto. La distancia se calcula automáticamente al guardar (si OSRM responde).
        </p>
      </div>
      <NewRequestForm />
    </div>
  );
}
