import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { getDailyDatePST } from './dailyConfig.js';
import { scoreResult } from './DailyService.js';

// Counts challenge participants whose completions are unseen by the
// originator. A row counts as "unseen" when it isn't the originator's
// own row AND its completion landed after last_viewed_at — falling back
// to the originator's own completion time when the view has never been
// opened. Returned as a Map keyed by challenge_id for cheap O(1) lookups
// from the history endpoint.
export interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  completed_at: Date;
}

export interface ChallengeOwnerRow {
  id: string;
  completed_at: Date;
  last_viewed_at: Date | null;
}

export function computeChallengeNewResults(
  ownerRows: ChallengeOwnerRow[],
  participantRows: ChallengeParticipantRow[],
): Map<string, number> {
  const baseline = new Map<string, number>();
  for (const owner of ownerRows) {
    const cutoff = owner.last_viewed_at ?? owner.completed_at;
    baseline.set(owner.id, cutoff.getTime());
  }

  const counts = new Map<string, number>();
  for (const owner of ownerRows) counts.set(owner.id, 0);

  for (const p of participantRows) {
    const cutoffMs = baseline.get(p.challenge_id);
    if (cutoffMs === undefined) continue;
    if (p.id === p.challenge_id) continue; // skip owner's own row
    if (p.completed_at.getTime() > cutoffMs) {
      counts.set(p.challenge_id, (counts.get(p.challenge_id) ?? 0) + 1);
    }
  }

  return counts;
}

export interface RecordFreePlayCompletionOpts {
  userId: string | null;
  board: string[][];
  foundWords: string[];
  timeLimit: number;
  boardSize: number;
  minWordLength: number;
  // Non-null when this session was started via a shared-challenge link.
  // The id is the originator session id and groups every player who
  // accepted that link, including the originator after they tap share.
  challengeId: string | null;
  // Pre-generated row id. Letting the caller pick the id means we can
  // expose it on the /end and /results responses without waiting on the
  // (fire-and-forget) insert to round-trip first.
  id: string;
  // The numeric board seed used to generate this game. Persisted so a
  // historic share link can hand the same board to another player.
  seed: number | null;
}

// Records a completed free-play game as a historical row. Mirrors the
// shape of daily_results so a "play history" UI can union the two tables
// with a single projection.
//
// Scoring is recomputed from foundWords via scoreResult — same source of
// truth daily_results uses — so the persisted points/word_count/
// longest_word are always consistent with the canonical scoring rules.
export async function recordFreePlayCompletion(
  db: Kysely<Database>,
  opts: RecordFreePlayCompletionOpts,
): Promise<void> {
  const { points, wordCount, longestWord } = scoreResult(opts.foundWords);
  await db
    .insertInto('free_play_sessions')
    .values({
      id: opts.id,
      user_id: opts.userId,
      date: getDailyDatePST(),
      board: JSON.stringify(opts.board),
      found_words: JSON.stringify(opts.foundWords),
      points,
      word_count: wordCount,
      longest_word: longestWord,
      time_limit: opts.timeLimit,
      board_size: opts.boardSize,
      min_word_length: opts.minWordLength,
      challenge_id: opts.challengeId,
      seed: opts.seed,
    })
    .execute();
}
