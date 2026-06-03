import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une múltiples sets de clases de Tailwind resolviendo conflictos
 * (ej. "px-2 px-4" → "px-4"). Estándar en componentes con variantes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
