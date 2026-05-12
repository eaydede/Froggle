import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { getDailyDatePST } from './dailyConfig.js';
import { scoreResult } from './DailyService.js';

export interface RecordFreePlayCompletionOpts {
  userId: string | null;
  board: string[][];
  foundWords: string[];
  timeLimit: number;
  boardSize: number;
  minWordLength: number;
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
    })
    .execute();
}
