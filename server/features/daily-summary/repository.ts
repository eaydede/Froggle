import { sql, type Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';


export function listTimedResults(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_results')
    .select((eb) => eb.fn.countAll<number>().as('players'))
    .where('date', '=', date)
    .executeTakeFirstOrThrow();
}

export function listZenResults(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_zen_results')
    .select((eb) => [
      eb.fn.countAll<number>().as('players'),
      eb.fn.sum<number>('active_seconds').as('active_seconds'),
    ])
    .where('date', '=', date)
    .executeTakeFirstOrThrow();
}

export function listMoneyResults(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_time_is_money_results')
    .select((eb) => eb.fn.countAll<number>().as('players'))
    .where('date', '=', date)
    .executeTakeFirstOrThrow();
}

export function listFreePlayResults(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('free_play_sessions')
    .select((eb) => eb.fn.countAll<number>().as('games'))
    .where('date', '=', date)
    .where('completed_at', 'is not', null)
    .executeTakeFirstOrThrow();
}

export function listFeedback(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('feedback')
    .select(['id', 'user_id', 'message', 'created_at'])
    .where(
      sql<string>`(created_at at time zone 'America/Los_Angeles')::date::text`,
      '=',
      date,
    )
    .orderBy('created_at', 'asc')
    .execute();
}
