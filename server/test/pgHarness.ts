import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { resetDb } from '../db/index.js';
import type { Database } from '../db/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');

// Supabase provisions these in prod; our plain-Postgres container does not.
// The mode tables themselves are vanilla SQL, but service code reaches for
// auth.users (display-name lookups) and migrations may reference Supabase
// roles/helpers, so we stub the minimum surface to let the real migration
// chain apply unchanged.
const SUPABASE_BOOTSTRAP = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key,
    raw_user_meta_data jsonb,
    raw_app_meta_data jsonb
  );
  do $$ begin create role anon;          exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role;  exception when duplicate_object then null; end $$;
  create or replace function auth.uid() returns uuid language sql stable as $fn$ select null::uuid $fn$;
`;

const APP_TABLES = [
  'daily_results',
  'daily_zen_results',
  'daily_gauntlet_results',
  'free_play_sessions',
  'feedback',
] as const;

export interface TestDb {
  db: Kysely<Database>;
  pool: Pool;
  /** Wipe every app table between tests so cases stay independent. */
  truncateAll: () => Promise<void>;
  /** Tear down the Kysely pool and stop the container. */
  stop: () => Promise<void>;
}

// Cheap synchronous probe so suites can `describe.runIf(dockerAvailable())`
// and skip (rather than fail) on machines without a running Docker daemon.
export function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Boots a throwaway Postgres, applies the full migration chain in filename
// order (which also exercises that the migrations still apply cleanly), and
// binds the app's getDb() singleton to it via DATABASE_URL so service code
// that uses the global pool hits the same database.
export async function startTestDb(): Promise<TestDb> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  ).start();

  const connectionString = container.getConnectionUri();
  process.env.DATABASE_URL = connectionString;

  const pool = new Pool({ connectionString });
  await pool.query(SUPABASE_BOOTSTRAP);

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of migrations) {
    const sqlText = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await pool.query(sqlText);
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    db,
    pool,
    async truncateAll() {
      await pool.query(
        `truncate ${APP_TABLES.map((t) => `public.${t}`).join(', ')} restart identity cascade;`,
      );
      await pool.query('truncate auth.users cascade;');
    },
    async stop() {
      await db.destroy();
      // Service code under test (e.g. display-name lookups) may have lazily
      // opened the app-wide getDb() pool against this container. Close it too,
      // before the container stops, so pg doesn't raise an uncaught
      // "terminating connection" error that fails the run despite green tests.
      await resetDb();
      await container.stop();
    },
  };
}
