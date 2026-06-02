import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { LoginSchema } from '@/lib/validators/auth';
import { findUserByEmail } from '@/lib/repositories/users';
import { verifyPassword } from '@/lib/auth/password';
import { issueSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth/jwt';
import { handleApiError, unauthorized, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Set-Cookie: bvt_session (httpOnly, sameSite=lax, secure en prod)
 *
 * - Requiere Content-Type: application/json (cierra vector CSRF de form
 *   submission cross-origin con enctype=text/plain).
 * - Body inválido → 400 (no 500).
 * - Misma respuesta 401 para "user no existe" o "password incorrecto"
 *   (evita user enumeration).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = (req.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content-Type debe ser application/json.',
          },
        },
        { status: 415 },
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw validationError('Body no es JSON válido.');
    }
    const body = LoginSchema.parse(raw);

    const user = await findUserByEmail(body.email);
    if (!user) {
      throw unauthorized('Credenciales inválidas.');
    }

    const ok = await verifyPassword(body.password, user.password_hash);
    if (!ok) {
      throw unauthorized('Credenciales inválidas.');
    }

    const token = await issueSessionToken({
      sub: String(user.id),
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });

    // secure se decide por `COOKIE_SECURE` independiente de NODE_ENV:
    // habilitarlo solo cuando el deploy está detrás de TLS. Por defecto false
    // para que el demo local sobre HTTP funcione. En cualquier deploy real
    // setear COOKIE_SECURE=true.
    const cookieSecure = process.env.COOKIE_SECURE === 'true';
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
