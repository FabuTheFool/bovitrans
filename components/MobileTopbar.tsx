'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LayoutDashboard,
  Truck,
  Settings,
  LogOut,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { api } from '@/lib/client/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { SidebarUser } from '@/components/Sidebar';
import { toast } from 'sonner';

const NAV = [
  { href: '/',         label: 'Panel principal', icon: LayoutDashboard, adminOnly: false },
  { href: '/fleet',    label: 'Flota',           icon: Truck,           adminOnly: false },
  { href: '/settings', label: 'Configuración',   icon: Settings,        adminOnly: true  },
] as const;

export function MobileTopbar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await api.post('/api/auth/logout');
      toast.success('Sesión cerrada');
    } catch {
      toast.error('No se pudo cerrar sesión');
    } finally {
      setOpen(false);
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 overflow-hidden border-b border-card-border glass-strong px-4 md:hidden" data-no-drag>
        <div
          aria-hidden
          className="absolute inset-0 -z-0 bg-gradient-to-r from-primary/15 via-transparent to-accent/15 dark:from-primary/10 dark:to-accent/10"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="relative z-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-md bg-white ring-1 ring-primary/30">
            <Image src="/bovitranslogo.png" alt="BoviTrans" fill sizes="28px" className="object-cover" />
          </div>
          <span className="font-semibold tracking-tight">BoviTrans</span>
        </Link>
        <div className="relative z-10 ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
            >
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="relative h-9 w-9 overflow-hidden rounded-lg bg-muted">
                  <Image src="/bovitranslogo.png" alt="" fill sizes="36px" className="object-cover" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">BoviTrans</div>
                  <div className="text-xs text-muted-foreground">Gestión ganadera</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <nav className="flex-1 space-y-1 px-3 py-4">
                {NAV.map((item) => {
                  if (item.adminOnly && user.rol !== 'admin') return null;
                  const active =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border p-3 space-y-2">
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {user.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{user.nombre}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {user.rol === 'admin' ? (
                        <ShieldCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <UserIcon className="h-3 w-3" />
                      )}
                      <span>{user.rol}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
