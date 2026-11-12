import { type Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';
import { findWordCounts } from './repository.js';

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

async function aggregate(db: Kysely<Database>, table: 'daily_results' | 'daily_zen_results' | 'daily_time_is_money_results', date: string): Promise<WordPercents> {
  const { total, finds } = await findWordCounts(db, table, date);
  if (!total) return {};
  return Object.fromEntries(finds.map(row => [row.word, Number(row.finders) / total * 100]));
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
const timeIsMoneyCacheRef: CacheRef = { value: null };

export function getTimedDailyWordPercents(
  db: Kysely<Database>,
  date: string,
  today: string,
): Promise<WordPercents> {
  return getCachedWordPercents(timedCacheRef, (d) => aggregate(db, 'daily_results', d), date, today);
}

export function getZenDailyWordPercents(
  db: Kysely<Database>,
  date: string,
  today: string,
): Promise<WordPercents> {
  return getCachedWordPercents(zenCacheRef, (d) => aggregate(db, 'daily_zen_results', d), date, today);
}

export function getTimeIsMoneyDailyWordPercents(
  db: Kysely<Database>,
  date: string,
  today: string,
): Promise<WordPercents> {
  return getCachedWordPercents(timeIsMoneyCacheRef, (d) => aggregate(db, 'daily_time_is_money_results', d), date, today);
}
