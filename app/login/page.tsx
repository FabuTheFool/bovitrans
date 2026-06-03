import Image from 'next/image';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Ingresar' };

const SHOW_DEMO_CREDS = process.env.NODE_ENV !== 'production';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 h-24 w-24">
            {/* Glow detrás del logo */}
            <div aria-hidden className="absolute inset-0 -z-10 rounded-3xl bg-brand-gradient opacity-30 blur-2xl" />
            <div className="relative h-24 w-24 overflow-hidden rounded-3xl glass-strong p-1 shadow-2xl ring-1 ring-primary/30">
              <div className="relative h-full w-full overflow-hidden rounded-2xl">
                <Image
                  src="/bovitranslogo.png"
                  alt="BoviTrans"
                  fill
                  sizes="96px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">BoviTrans</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Plataforma de gestión de transporte ganadero
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-xl shadow-primary/5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Ingresar</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Usá tus credenciales para acceder al panel.
            </p>
          </div>
          <LoginForm next={searchParams.next} />
        </div>

        {SHOW_DEMO_CREDS ? (
          <div className="mt-4 glass rounded-lg p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Credenciales de demo (solo dev)</p>
              <ul className="space-y-0.5 font-mono">
                <li><span className="text-primary">Admin:</span> admin@bovitrans.local / BoviTrans2026!</li>
                <li><span className="text-primary">Operador:</span> operador@bovitrans.local / Operador2026!</li>
              </ul>
            </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BoviTrans · MVP
        </p>
      </div>
    </main>
  );
}
