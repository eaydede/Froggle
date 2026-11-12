import { sql, type Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';


export function listTimedDates(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_results')
    .select('date')
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .where('ended_at', 'is not', null)
    .execute();
}

export function listZenDates(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_zen_results')
    .select('date')
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();
}

export function listGauntletDates(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_gauntlet_results')
    .select('date')
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();
}

export function listMoneyDates(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_time_is_money_results')
    .select('date')
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();
}

export function listRankedHistory(db: Kysely<Database>, windowStart: string, windowEnd: string, userId: string) {
  return db
    .with('ranked', (qb) =>
      qb
        .selectFrom('daily_results')
        .select((eb) => [
          'user_id',
          'date',
          'points',
          'word_count',
          'longest_word',
          'board_size',
          'min_word_length',
          'time_limit',
          sql<number>`rank() over (partition by ${eb.ref('date')} order by ${eb.ref('points')} desc)`.as('rank'),
        ])
        .where('date', '>=', windowStart)
        .where('date', '<=', windowEnd)
        .where('ended_at', 'is not', null)
    )
    .selectFrom('ranked')
    .select(['date', 'points', 'word_count', 'longest_word', 'board_size', 'min_word_length', 'time_limit', 'rank'])
    .where('user_id', '=', userId)
    .execute();
}

export function countPlayers(db: Kysely<Database>, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_results')
    .select((eb) => ['date', eb.fn.countAll<number>().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .where('ended_at', 'is not', null)
    .groupBy('date')
    .execute();
}
