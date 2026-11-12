import type { Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';


export function listHistory(db: Kysely<Database>, userId: string) {
  return db
    .selectFrom('free_play_sessions')
    .select([
      'id',
      'challenge_id',
      'date',
      'completed_at',
      'last_viewed_at',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'time_limit',
      'min_word_length',
      'seed',
    ])
    .where('user_id', '=', userId)
    .where('completed_at', 'is not', null)
    .orderBy('completed_at', 'desc')
    .limit(200)
    .execute();
}

export function listChallengeParticipants(db: Kysely<Database>, challengeIds: string[]) {
  return db
    .selectFrom('free_play_sessions')
    .select(['id', 'challenge_id', 'completed_at', 'points', 'word_count'])
    .where('challenge_id', 'in', challengeIds)
    .where('completed_at', 'is not', null)
    .execute();
}

export function listOwnedChallenges(db: Kysely<Database>, userId: string) {
  return db
    .selectFrom('free_play_sessions')
    .select(['id', 'completed_at', 'last_viewed_at'])
    .where('user_id', '=', userId)
    .whereRef('id', '=', 'challenge_id')
    .where('completed_at', 'is not', null)
    .execute();
}

export function listCompletedParticipants(db: Kysely<Database>, ownedRows: { id: string; completed_at: Date; last_viewed_at: Date | null; }[]) {
  return db
    .selectFrom('free_play_sessions')
    .select(['id', 'challenge_id', 'completed_at'])
    .where('challenge_id', 'in', ownedRows.map((r) => r.id))
    .where('completed_at', 'is not', null)
    .execute();
}

export function findSavedSession(db: Kysely<Database>, sessionId: string) {
  return db
    .selectFrom('free_play_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();
}
