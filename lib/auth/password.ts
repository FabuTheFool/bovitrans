import bcrypt from 'bcryptjs';

/**
 * Hashing y verificación de passwords.
 * Cost 12 → ~250ms en hardware moderno. Buen balance UX/seguridad.
 */
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
