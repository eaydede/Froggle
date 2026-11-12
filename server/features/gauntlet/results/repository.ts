import type { Kysely } from 'kysely';
import type { Database } from '../../../platform/database/types.js';


export function findComparisonSessions(db: Kysely<Database>, date: string, roundIndex: number, userId: string, otherUserId: string) {
  return db
    .selectFrom('daily_gauntlet_results')
    .selectAll()
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .where('user_id', 'in', [userId, otherUserId])
    .execute();
}
