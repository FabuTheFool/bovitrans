'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx | null>(null);
const STORAGE_KEY = 'bvt:sidebar:collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  // El initial es false (expandido). Se hidrata desde localStorage en cliente.
  const [collapsed, setCollapsedRaw] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === '1') setCollapsedRaw(true);
    setHydrated(true);
  }, []);

  function setCollapsed(v: boolean) {
    setCollapsedRaw(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    }
  }

  function toggle() { setCollapsed(!collapsed); }

  return (
    <Ctx.Provider value={{ collapsed: hydrated ? collapsed : false, toggle, setCollapsed }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
