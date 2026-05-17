import { sql, type Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export type WordPercents = Record<string, number>;

export interface CacheEntry {
  date: string;
  percents: WordPercents;
  expiresAt: number;
}

export interface CacheRef {
  value: CacheEntry | null;
}

export const TODAY_TTL_MS = 60_000;

interface AggregateRow {
  word: string;
  finders: number | string;
}

async function aggregateTimed(db: Kysely<Database>, date: string): Promise<WordPercents> {
  // Only finalized timed sessions count toward popularity. In-progress
  // sessions would otherwise drag every word's percentage downward — the
  // denominator must match "people who had a fair shot at finding it".
  // jsonb_array_elements_text unnests the found_words array; the upper()
  // normalization protects against any historical lower-cased entries.
  const totalsQuery = sql<{ total: number | string }>`
    select count(*)::int as total
    from daily_results
    where date = ${date} and ended_at is not null
  `;
  const findsQuery = sql<AggregateRow>`
    select upper(w::text) as word, count(distinct r.user_id)::int as finders
    from daily_results r,
         lateral jsonb_array_elements_text(r.found_words) as w
    where r.date = ${date} and r.ended_at is not null
    group by upper(w::text)
  `;
  const [totalsResult, findsResult] = await Promise.all([
    totalsQuery.execute(db),
    findsQuery.execute(db),
  ]);
  const total = Number(totalsResult.rows[0]?.total ?? 0);
  if (total === 0) return {};
  const out: WordPercents = {};
  for (const row of findsResult.rows) {
    out[row.word] = (Number(row.finders) / total) * 100;
  }
  return out;
}

async function aggregateZen(db: Kysely<Database>, date: string): Promise<WordPercents> {
  // Only finalized zen sessions count toward popularity. In-progress
  // players would otherwise drag every word's percentage downward — the
  // denominator must match "people who had a fair shot at finding it".
  const totalsQuery = sql<{ total: number | string }>`
    select count(*)::int as total
    from daily_zen_results
    where date = ${date} and ended_at is not null
  `;
  const findsQuery = sql<AggregateRow>`
    select upper(w::text) as word, count(distinct r.user_id)::int as finders
    from daily_zen_results r,
         lateral jsonb_array_elements_text(r.found_words) as w
    where r.date = ${date} and r.ended_at is not null
    group by upper(w::text)
  `;
  const [totalsResult, findsResult] = await Promise.all([
    totalsQuery.execute(db),
    findsQuery.execute(db),
  ]);
  const total = Number(totalsResult.rows[0]?.total ?? 0);
  if (total === 0) return {};
  const out: WordPercents = {};
  for (const row of findsResult.rows) {
    out[row.word] = (Number(row.finders) / total) * 100;
  }
  return out;
}

/** Read-through cache that only memoizes today's date. Historic dates
 *  always recompute (their popularity is final, but we accept the small
 *  per-request cost rather than retaining unbounded state). The cache ref
 *  is mutated in place so each pair of (cacheRef, aggregate) shares one
 *  slot regardless of how many concurrent callers there are.
 *
 *  Exported so the cache decision can be unit tested without a database
 *  connection. */
export async function getCachedWordPercents(
  cacheRef: CacheRef,
  aggregate: (date: string) => Promise<WordPercents>,
  date: string,
  today: string,
  now: number = Date.now(),
): Promise<WordPercents> {
  const cached = cacheRef.value;
  if (date === today && cached?.date === today && cached.expiresAt > now) {
    return cached.percents;
  }
  const percents = await aggregate(date);
  if (date === today) {
    cacheRef.value = { date, percents, expiresAt: now + TODAY_TTL_MS };
  }
  return percents;
}

const timedCacheRef: CacheRef = { value: null };
const zenCacheRef: CacheRef = { value: null };

export function getTimedDailyWordPercents(
  db: Kysely<Database>,
  date: string,
  today: string,
): Promise<WordPercents> {
  return getCachedWordPercents(timedCacheRef, (d) => aggregateTimed(db, d), date, today);
}

export function getZenDailyWordPercents(
  db: Kysely<Database>,
  date: string,
  today: string,
): Promise<WordPercents> {
  return getCachedWordPercents(zenCacheRef, (d) => aggregateZen(db, d), date, today);
}
