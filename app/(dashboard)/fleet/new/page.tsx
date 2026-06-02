import { TruckForm } from './TruckForm';

export default function NewTruckPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Registrar nuevo camión</h1>
        <p className="mt-1 text-sm text-slate-600">
          Los datos críticos (patente, capacidad y consumo) son inmutables una vez creados.
          Verificá los valores antes de guardar.
        </p>
      </header>
      <TruckForm />
    </div>
  );
}
