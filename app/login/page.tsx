import { LoginForm } from './LoginForm';

export const metadata = { title: 'Ingresar — BoviTrans' };

/** Mostrar credenciales demo solo fuera de producción. */
const SHOW_DEMO_CREDS = process.env.NODE_ENV !== 'production';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white text-2xl font-bold shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">BoviTrans</h1>
          <p className="mt-1 text-sm text-slate-600">Gestión de Transporte Ganadero</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Ingresar</h2>
          <p className="mt-1 text-xs text-slate-500">
            Usá tus credenciales para acceder al panel del operador.
          </p>
          <div className="mt-5">
            <LoginForm next={searchParams.next} />
          </div>
        </div>

        {SHOW_DEMO_CREDS ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Credenciales de demo (solo dev):</p>
            <ul className="mt-1 space-y-0.5 font-mono">
              <li><strong>Admin:</strong> admin@bovitrans.local / BoviTrans2026!</li>
              <li><strong>Operador:</strong> operador@bovitrans.local / Operador2026!</li>
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
