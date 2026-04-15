// Backfills points/word_count/longest_word on daily_results rows written
// before Phase 2 (which started persisting these columns on submission).
//
// Safe to run repeatedly: only selects rows where points = 0 AND
// word_count = 0. Any real play produces points > 0 so completed rows
// are never re-swept.
//
// Usage:
//   DATABASE_URL=postgres://... npx tsx scripts/backfillDailyAggregates.ts
//
// Runs automatically in the deploy workflows after migrations apply.
// Remove this script and the CI step once all historical rows have
// been backfilled on every environment.

import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { scoreResult } from '../server/services/DailyService.js';
import type { Database } from '../server/db/types.js';

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

  const rows = await db
    .selectFrom('daily_results')
    .select(['id', 'found_words'])
    .where('points', '=', 0)
    .where('word_count', '=', 0)
    .execute();

  console.log(`Found ${rows.length} row(s) to backfill.`);

  let updated = 0;
  for (const row of rows) {
    const foundWords: string[] = typeof row.found_words === 'string'
      ? JSON.parse(row.found_words)
      : (row.found_words as unknown as string[]);

    const { points, wordCount, longestWord } = scoreResult(foundWords);

    // Skip rows that legitimately have zero points (e.g. user opened
    // the puzzle without finding any words). Re-running wouldn't hurt,
    // but skipping keeps the "rows to backfill" count honest.
    if (points === 0 && wordCount === 0) continue;

    await db
      .updateTable('daily_results')
      .set({
        points,
        word_count: wordCount,
        longest_word: longestWord,
      })
      .where('id', '=', row.id)
      .execute();

    updated++;
  }

  console.log(`Backfilled ${updated} row(s).`);
  await db.destroy();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
