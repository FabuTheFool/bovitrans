import { z } from 'zod';

export const UserRolSchema = z.enum(['operador', 'admin']);
export type UserRol = z.infer<typeof UserRolSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().email('Email inválido.').max(200),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserPublicSchema = z.object({
  id: z.number().int().positive(),
  email: z.string(),
  nombre: z.string(),
  rol: UserRolSchema,
});
export type UserPublic = z.infer<typeof UserPublicSchema>;
