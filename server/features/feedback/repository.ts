import type { Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';

export async function insertFeedback(db: Kysely<Database>, userId: string | null, message: string) {
  await db.insertInto('feedback').values({ user_id: userId, message }).execute();
}
