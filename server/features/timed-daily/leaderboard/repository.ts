import type { Kysely } from 'kysely';
import type { Database } from '../../../platform/database/types.js';


export function listFinishedSessions(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_results')
    .selectAll()
    .where('date', '=', date)
    .where('ended_at', 'is not', null)
    .execute();
}
