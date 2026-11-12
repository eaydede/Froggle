import type { Kysely } from 'kysely';
import type { Database } from '../../../platform/database/types.js';


export function findResult(db: Kysely<Database>, userId: string, date: string) {
  return db
    .selectFrom('daily_results')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .executeTakeFirst();
}

export function findComparisonSessions(db: Kysely<Database>, date: string, userId: string, otherUserId: string) {
  return db
    .selectFrom('daily_results')
    .selectAll()
    .where('date', '=', date)
    .where('user_id', 'in', [userId, otherUserId])
    .execute();
}

export function listUserResults(db: Kysely<Database>, userId: string) {
  return db
    .selectFrom('daily_results')
    .selectAll()
    .where('user_id', '=', userId)
    .where('ended_at', 'is not', null)
    .orderBy('date', 'desc')
    .execute();
}
