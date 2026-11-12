import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types.js';

let db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false },
        }),
      }),
    });
  }
  return db;
}

// Test-only: tear down the singleton pool and clear it so the next getDb()
// rebuilds. Integration tests bind getDb() to a throwaway container via
// DATABASE_URL; they must close this pool BEFORE stopping the container,
// otherwise pg raises an uncaught "terminating connection" error when the
// server shuts down underneath the still-open client.
export async function resetDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
