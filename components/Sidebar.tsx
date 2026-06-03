'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/client/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSidebar } from '@/components/SidebarContext';

const NAV = [
  { href: '/',         label: 'Panel principal', icon: LayoutDashboard, adminOnly: false },
  { href: '/fleet',    label: 'Flota',           icon: Truck,           adminOnly: false },
  { href: '/settings', label: 'Configuración',   icon: Settings,        adminOnly: true  },
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
  const { collapsed, toggle } = useSidebar();

  async function logout() {
    setLoggingOut(true);
    try {
      await api.post('/api/auth/logout');
      toast.success('Sesión cerrada');
    } catch {
      toast.error('No se pudo cerrar sesión');
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const initials = user.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <TooltipProvider delayDuration={150}>
      <motion.aside
        animate={{ width: collapsed ? 72 : 280 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden md:flex"
      >
        <div className="glass-strong flex h-full flex-col border-r border-card-border">
          {/* Brand — con tinte gradient para diferenciarse del resto del sidebar */}
          <div
            className={cn(
              'relative flex items-center gap-3 overflow-hidden border-b border-card-border px-4 py-4',
              collapsed && 'justify-center px-2',
            )}
          >
            {/* Overlay gradient violeta→teal (visible en light, sutil en dark) */}
            <div
              aria-hidden
              className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/20 via-primary/8 to-accent/15 dark:from-primary/15 dark:via-transparent dark:to-accent/12"
            />
            {/* Banda de color en el borde inferior */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-accent/40"
            />

            <div className="relative z-10 h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-primary/30">
              <Image src="/bovitranslogo.png" alt="BoviTrans" fill sizes="40px" className="object-cover" priority />
            </div>
            {!collapsed ? (
              <div className="relative z-10 min-w-0 flex-1 leading-tight">
                <div className="truncate text-base font-semibold tracking-tight">BoviTrans</div>
                <div className="truncate text-[11px] text-muted-foreground">Gestión ganadera</div>
              </div>
            ) : null}
            {!collapsed ? <div className="relative z-10"><ThemeToggle /></div> : null}
          </div>

          {/* Toggle collapse */}
          <div className={cn('py-2', collapsed ? 'flex justify-center px-2' : 'px-3')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? 'icon' : 'sm'}
                  onClick={toggle}
                  aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                  className={cn('text-muted-foreground hover:text-foreground', !collapsed && 'w-full justify-start gap-2')}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  {!collapsed ? <span className="text-xs">Colapsar</span> : null}
                </Button>
              </TooltipTrigger>
              {collapsed ? <TooltipContent side="right">Expandir</TooltipContent> : null}
            </Tooltip>
          </div>

          {/* Nav */}
          <nav
            className={cn(
              'flex-1 space-y-1',
              collapsed ? 'flex flex-col items-center px-2' : 'px-3',
            )}
            aria-label="Navegación principal"
          >
            {NAV.map((item) => {
              if (item.adminOnly && user.rol !== 'admin') return null;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              const linkClass = cn(
                'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              );

              const inner = (
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass}>
                  {active ? (
                    <span aria-hidden className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  ) : null}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{inner}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.href}>{inner}</div>
              );
            })}
          </nav>

          {/* Theme toggle visible cuando está colapsado */}
          {collapsed ? (
            <div className="flex justify-center border-t border-card-border py-2">
              <ThemeToggle />
            </div>
          ) : null}

          {/* User */}
          <div className={cn('border-t border-card-border', collapsed ? 'p-2' : 'p-3')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-muted',
                    collapsed ? 'justify-center p-1.5' : 'px-2 py-2',
                  )}
                  aria-label={`Menú de usuario ${user.nombre}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white shadow-sm">
                    {initials}
                  </div>
                  {!collapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{user.nombre}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-60">
                <DropdownMenuLabel className="flex items-center gap-2">
                  {user.rol === 'admin' ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5" />
                  )}
                  <span>Rol: {user.rol}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} disabled={loggingOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
