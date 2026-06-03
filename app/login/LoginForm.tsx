'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/client/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await api.post<{ nombre: string; rol: string }>('/api/auth/login', {
        email: email.trim(),
        password,
      });
      toast.success(`Bienvenido, ${data?.nombre ?? 'usuario'}`);
      router.push(safeNext(next));
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Error inesperado.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'login-error' : undefined}
          placeholder="vos@ejemplo.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          minLength={8}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'login-error' : undefined}
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <div
          id="login-error"
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {busy ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  );
}

function safeNext(next?: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}
