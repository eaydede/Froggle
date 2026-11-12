import type { Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';


export function findShareableSession(db: Kysely<Database>, sessionId: string) {
  return db
    .selectFrom('free_play_sessions')
    .select(['id', 'user_id', 'challenge_id', 'completed_at'])
    .where('id', '=', sessionId)
    .executeTakeFirst();
}

export function markShared(db: Kysely<Database>, row: { id: string; user_id: string | null; completed_at: Date | null; challenge_id: string | null; }) {
  return db
    .updateTable('free_play_sessions')
    .set({ challenge_id: row.id })
    .where('id', '=', row.id)
    .execute();
}

export function findParticipation(db: Kysely<Database>, challengeId: string, userId: string) {
  return db
    .selectFrom('free_play_sessions')
    .select('id')
    .where('challenge_id', '=', challengeId)
    .where('user_id', '=', userId)
    .where('completed_at', 'is not', null)
    .executeTakeFirst();
}

export function listPreviewSessions(db: Kysely<Database>, challengeId: string) {
  return db
    .selectFrom('free_play_sessions')
    .select([
      'id',
      'user_id',
      'board_size',
      'min_word_length',
      'time_limit',
      'seed',
    ])
    .where('challenge_id', '=', challengeId)
    .where('completed_at', 'is not', null)
    .execute();
}

export function listChallengeSessions(db: Kysely<Database>, challengeId: string) {
  return db
    .selectFrom('free_play_sessions')
    .selectAll()
    .where('challenge_id', '=', challengeId)
    .where('completed_at', 'is not', null)
    .execute();
}

export function markViewed(db: Kysely<Database>, ownerRow: { id: string; user_id: string | null; date: string; found_words: string; board: string; started_at: Date; completed_at: Date | null; points: number; word_count: number; longest_word: string; time_limit: number; board_size: number; min_word_length: number; challenge_id: string | null; seed: number | null; last_viewed_at: Date | null; } & { completed_at: Date; }) {
  return db.updateTable('free_play_sessions')
    .set({ last_viewed_at: new Date() })
    .where('id', '=', ownerRow.id)
    .execute();
}
