export function formatCurrency(amount: number, currency = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '—';
  return `${km.toLocaleString('es-UY', { maximumFractionDigits: 1 })} km`;
}

export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, '0')} min`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  return formatDateTime(iso);
}
