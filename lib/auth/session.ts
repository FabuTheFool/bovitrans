import 'server-only';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from './jwt';
import type { UserRol } from '@/lib/validators/auth';
import { unauthorized, forbidden } from '@/lib/api/errors';

/**
 * Devuelve la sesión actual leyendo la cookie httpOnly. null si no hay sesión.
 * Server-only: usar en Server Components y route handlers.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Para Server Components que muestran datos del usuario.
 * Devuelve los campos públicos en forma cómoda para la UI.
 */
export async function getCurrentUserPublic() {
  const session = await getCurrentSession();
  if (!session) return null;
  return {
    id: Number(session.sub),
    email: session.email,
    nombre: session.nombre,
    rol: session.rol,
  };
}

/**
 * Para route handlers que necesitan exigir sesión. Lanza ApiError si no hay.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw unauthorized();
  }
  return session;
}

/**
 * Para route handlers RBAC. Lanza 403 si el rol no coincide.
 */
export async function requireRole(rol: UserRol): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.rol !== rol) {
    throw forbidden(`Esta acción requiere rol "${rol}". Tu rol actual: "${session.rol}".`);
  }
  return session;
}
