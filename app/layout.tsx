import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BoviTrans — Gestión de Transporte Ganadero',
    template: '%s · BoviTrans',
  },
  description: 'Plataforma logística para el transporte terrestre de ganado vacuno.',
  icons: {
    icon: '/bovitranslogo.png',
    apple: '/bovitranslogo.png',
  },
  openGraph: {
    title: 'BoviTrans',
    description: 'Plataforma logística para el transporte terrestre de ganado vacuno.',
    images: ['/bovitranslogo.png'],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
