import { Pool, QueryResultRow } from "pg";

const pools = new Map<string, Pool>();

export function getPool(connectionString: string) {
  if (!pools.has(connectionString)) {
    pools.set(
      connectionString,
      new Pool({
        connectionString,
        max: 30,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000
      })
    );
  }

  return pools.get(connectionString)!;
}

export async function query<T extends QueryResultRow>(
  connectionString: string,
  sql: string,
  params: unknown[] = []
) {
  return getPool(connectionString).query<T>(sql, params);
}
