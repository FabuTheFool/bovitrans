export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-brand-700">BoviTrans</h1>
        <p className="text-slate-600">
          Plataforma de gestión de transporte ganadero. MVP en construcción.
        </p>
        <p className="text-sm text-slate-500">
          Próximamente: dashboard de solicitudes, administración de flota y
          asignación con cálculo dinámico de costos.
        </p>
      </div>
    </main>
  );
}
