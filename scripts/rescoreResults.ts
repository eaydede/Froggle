// Recomputes `points` on every daily_results and daily_zen_results row from
// the row's `found_words`, using the engine's current scoring formula.
//
// Idempotent: scoring is deterministic, so re-running on rows already at the
// current formula is a no-op write. Run after any change to engine/scoring.ts
// that should be applied retroactively to historical results.
//
// Touches `points` only — `word_count` and `longest_word` aren't formula-
// dependent so they don't need recomputation here.
//
// Usage:
//   DATABASE_URL=postgres://... npx tsx scripts/rescoreResults.ts
//
// Wired into the deploy workflows after migrations apply.

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { scoreWords } from '../server/services/DailyService.js';
import type { Database } from '../server/db/types.js';

function parseWords(raw: unknown): string[] {
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw as string[];
}

async function rescoreTable<T extends 'daily_results' | 'daily_zen_results'>(
  db: Kysely<Database>,
  table: T,
): Promise<{ scanned: number; changed: number }> {
  const rows = await db
    .selectFrom(table)
    .select(['id', 'found_words', 'points'])
    .execute();

  let changed = 0;
  for (const row of rows) {
    const words = parseWords(row.found_words);
    const newPoints = scoreWords(words);
    if (newPoints === row.points) continue;

    await db
      .updateTable(table)
      .set({ points: newPoints })
      .where('id', '=', row.id)
      .execute();

    changed++;
  }

  return { scanned: rows.length, changed };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
      }),
    }),
  });

  const daily = await rescoreTable(db, 'daily_results');
  console.log(`daily_results: scanned ${daily.scanned}, changed ${daily.changed}`);

  const zen = await rescoreTable(db, 'daily_zen_results');
  console.log(`daily_zen_results: scanned ${zen.scanned}, changed ${zen.changed}`);

  await db.destroy();
}

main().catch((err) => {
  console.error('Rescore failed:', err);
  process.exit(1);
});
