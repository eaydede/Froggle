import { sql, type Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';

type DailyTable = 'daily_results' | 'daily_zen_results' | 'daily_time_is_money_results';

// All three modes count finalized players and distinct finders identically.
// The closed table union keeps this shared persistence invariant explicit.
export async function findWordCounts(db: Kysely<Database>, table: DailyTable, date: string) {
  const [totals, finds] = await Promise.all([
    sql<{ total: number; }>`select count(*)::int as total from ${sql.table(table)} where date = ${date} and ended_at is not null`.execute(db),
    sql<{ word: string; finders: number; }>`
      select upper(w::text) as word, count(distinct r.user_id)::int as finders
      from ${sql.table(table)} r, lateral jsonb_array_elements_text(r.found_words) as w
      where r.date = ${date} and r.ended_at is not null group by upper(w::text)
    `.execute(db),
  ]);
  return { total: Number(totals.rows[0]?.total ?? 0), finds: finds.rows };
}
