import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';

/**
 * Middleware de Next.js — corre en Edge runtime.
 *
 * Reglas:
 *   - Rutas siempre públicas: /login, /api/auth/login, /api/auth/logout,
 *     /api/auth/me, /api/healthz, archivos estáticos.
 *   - Cualquier otra ruta (dashboard y APIs) exige sesión válida.
 *
 *   - Si no hay sesión válida y la request es UI: redirect a /login con
 *     ?next= para volver al destino original.
 *   - Si no hay sesión válida y la request es API: 401 JSON.
 */

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/healthz',
]);

const PUBLIC_UI_PATHS = new Set(['/login']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Archivos estáticos y assets de Next no pasan por matcher pero por las dudas.
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith('/api/');
  const isPublic = isApi ? PUBLIC_API_PATHS.has(pathname) : PUBLIC_UI_PATHS.has(pathname);

  if (isPublic) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } },
        { status: 401 },
      );
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher: aplicar middleware a todo excepto archivos estáticos.
 * Los excluimos vía pattern para evitar overhead en cada asset.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
