'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/client/api-client';

const NAV = [
  { href: '/',         label: 'Panel principal', icon: '◧', adminOnly: false },
  { href: '/fleet',    label: 'Flota',           icon: '⚙', adminOnly: false },
  { href: '/settings', label: 'Configuración',   icon: '◆', adminOnly: true },
] as const;

export interface SidebarUser {
  nombre: string;
  email: string;
  rol: 'operador' | 'admin';
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.post('/api/auth/logout');
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <aside className="hidden md:flex h-screen sticky top-0 w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
        <div className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
          B
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">BoviTrans</div>
          <div className="text-xs text-slate-500">Gestión ganadera</div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map((item) => {
          if (item.adminOnly && user.rol !== 'admin') return null;
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'mx-3 my-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{user.nombre}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  user.rol === 'admin'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700',
                )}
              >
                {user.rol}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}
