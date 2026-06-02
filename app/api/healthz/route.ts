import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/healthz
 *
 * Health probe usado por:
 *   - HEALTHCHECK del Dockerfile
 *   - Monitoreo externo
 *
 * Reporta el estado del proceso y de la conectividad con la DB.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | null = null;

  try {
    await query('SELECT 1');
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown error';
  }

  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    uptime_s: Math.round(process.uptime()),
    checked_ms: Date.now() - startedAt,
    db: { ok: dbOk, error: dbError },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: dbOk ? 200 : 503 });
}
