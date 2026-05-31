import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

/**
 * Parsea BIGINT como Number en lugar de string.
 * Seguro mientras los ids se mantengan por debajo de Number.MAX_SAFE_INTEGER
 * (2^53), lo cual aplica a este MVP. Si en el futuro se llega a esa escala,
 * cambiar a BigInt o a string en el DTO.
 *
 * OID 20 = int8 / bigint.
 */
types.setTypeParser(20, (val) => Number.parseInt(val, 10));

/**
 * Pool de conexiones PostgreSQL compartido por todas las route handlers.
 *
 * Inicialización lazy: el pool se crea la primera vez que se llama a una query.
 * Esto evita que `next build` falle al importar este módulo cuando
 * DATABASE_URL aún no está definida (build-time vs runtime).
 *
 * En desarrollo con hot-reload de Next.js, guardamos la referencia en
 * globalThis para no instanciar un pool nuevo por cada recarga.
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

export function getPool(): Pool {
  if (!globalThis.__bovitransPgPool) {
    globalThis.__bovitransPgPool = createPool();
  }
  return globalThis.__bovitransPgPool;
}

/**
 * Helper para queries simples con tipado de filas.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never);
}

/**
 * Helper para ejecutar varias queries dentro de una transacción.
 * Hace BEGIN / COMMIT / ROLLBACK automáticamente.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
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
