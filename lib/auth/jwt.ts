import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserRol } from '@/lib/validators/auth';

/**
 * Issuance + verification de JWT con jose (Edge-compatible).
 *
 * Decisiones:
 * - HS256 con clave simétrica (suficiente para single-tenant; en multi-tenant
 *   o federated identity migrar a RS256).
 * - TTL corto (8 horas) — refresh tokens fuera de alcance del MVP de auth.
 * - Cookie name: 'bvt_session'. Configurada httpOnly + same-site lax desde la
 *   route handler de login (acá solo manejamos el token, no la cookie).
 */

const ALGORITHM = 'HS256';
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8h
const ISSUER = 'bovitrans';
const AUDIENCE = 'bovitrans-app';

export interface SessionPayload extends JWTPayload {
  sub: string;         // user id como string
  email: string;
  nombre: string;
  rol: UserRol;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET no está definido o tiene menos de 32 caracteres. ' +
        'Configurar en .env (ver .env.example).',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function issueSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'bvt_session';
export const SESSION_TTL_SECONDS = TOKEN_TTL_SECONDS;
