import Link from 'next/link';
import { NewRequestForm } from './NewRequestForm';

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand-700 hover:underline">
          ← Volver al panel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cargá los datos del cliente y el trayecto. La distancia se calcula automáticamente al
          guardar (si el servicio de routing está disponible).
        </p>
      </div>
      <NewRequestForm />
    </div>
  );
}
