import { query } from '@/lib/db/client';
import type { UserRol } from '@/lib/validators/auth';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nombre: string;
  rol: UserRol;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const res = await query<UserRow>(
    `SELECT id, email, password_hash, nombre, rol::text AS rol
       FROM users WHERE email_normalizado = $1
       LIMIT 1`,
    [normalized],
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT id, email, password_hash, nombre, rol::text AS rol
       FROM users WHERE id = $1
       LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}
