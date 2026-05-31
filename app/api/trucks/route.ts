import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { CamionCreateSchema, type CamionDTO } from '@/lib/validators/truck';
import { handleApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trucks
 *
 * Listado de la flota.
 *
 * Query params:
 *   - estado: 'activo' | 'inactivo' (opcional)
 *
 * Implementa US-07.
 */
export async function GET(req: NextRequest) {
  try {
    const estado = req.nextUrl.searchParams.get('estado');
    const params: unknown[] = [];
    let whereClause = '';
    if (estado === 'activo' || estado === 'inactivo') {
      params.push(estado);
      whereClause = `WHERE estado = $1`;
    }

    const result = await query<CamionDTO>(
      `SELECT id, patente, patente_normalizada, capacidad_max,
              consumo_l_km::float AS consumo_l_km, estado,
              created_at::text, updated_at::text
         FROM camiones
         ${whereClause}
         ORDER BY (estado = 'activo') DESC, created_at DESC`,
      params,
    );

    return NextResponse.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/trucks
 *
 * Registra un nuevo camión.
 * Implementa US-06. Respeta INV-02 (patente única normalizada) y
 * INV-05 (valores positivos).
 *
 * Códigos HTTP:
 *   201 — Creado
 *   400 — Validación falló
 *   409 — Patente duplicada (mapeado desde error 23505 de Postgres)
 */
export async function POST(req: NextRequest) {
  try {
    const body = CamionCreateSchema.parse(await req.json());

    const result = await query<CamionDTO>(
      `INSERT INTO camiones (patente, capacidad_max, consumo_l_km)
       VALUES ($1, $2, $3)
       RETURNING id, patente, patente_normalizada, capacidad_max,
                 consumo_l_km::float AS consumo_l_km, estado,
                 created_at::text, updated_at::text`,
      [body.patente, body.capacidad_max, body.consumo_l_km],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
