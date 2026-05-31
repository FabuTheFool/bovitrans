/**
 * Normalización de patentes vehiculares.
 *
 * Regla (INV-02): la patente se compara case-insensitive y sin espacios.
 * Se persiste el valor original tipeado por el usuario, pero la unicidad
 * y comparación se hacen sobre la forma normalizada.
 *
 * Debe coincidir con la GENERATED COLUMN `patente_normalizada` en init.sql,
 * que aplica: UPPER(REGEXP_REPLACE(patente, '\s+', '', 'g')).
 */
export function normalizarPatente(patente: string): string {
  return patente.replace(/\s+/g, '').toUpperCase();
}
