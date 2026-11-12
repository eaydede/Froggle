import type { Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';
import { ApplicationError } from '../../platform/errors.js';
import { insertFeedback } from './repository.js';

export async function sendFeedback(db: Kysely<Database>, userId: string | null, text: string) {
  const message = text.trim();
  if (!message) throw new ApplicationError('invalid', 'message must not be empty');
  if (message.length > 2000) throw new ApplicationError('invalid', 'message must be 2000 characters or fewer');
  await insertFeedback(db, userId, message);
}
