'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

/**
 * Providers globales del cliente.
 * - next-themes: persistencia + sincronización SSR/CSR de light/dark.
 * - Sonner Toaster: feedback unificado fuera del flujo (errores, éxitos).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'group',
          },
        }}
      />
    </NextThemesProvider>
  );
}
