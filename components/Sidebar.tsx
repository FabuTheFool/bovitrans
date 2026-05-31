'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const NAV = [
  { href: '/',         label: 'Panel principal', icon: '◧' },
  { href: '/fleet',    label: 'Flota',           icon: '⚙' },
  { href: '/settings', label: 'Configuración',   icon: '◆' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

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

      <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
        MVP v0.1
      </div>
    </aside>
  );
}
