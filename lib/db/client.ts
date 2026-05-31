import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

/**
 * Pool de conexiones PostgreSQL compartido por todas las route handlers.
 *
 * En desarrollo con hot-reload de Next.js, evitamos instanciar un pool nuevo
 * por cada recarga guardando la referencia en globalThis.
 */
declare global {
  // eslint-disable-next-line no-var
  var __bovitransPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida en el entorno.');
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const pool: Pool =
  globalThis.__bovitransPgPool ?? (globalThis.__bovitransPgPool = createPool());

/**
 * Helper para queries simples con tipado de filas.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never);
}

/**
 * Helper para ejecutar varias queries dentro de una transacción.
 * Hace BEGIN / COMMIT / ROLLBACK automáticamente.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
