import { sql, type Kysely } from 'kysely';
import type { WordProgress } from '../../gameplay/types.js';
import type { Database } from '../../platform/database/types.js';
import { type DailyConfig } from './config.js';
import type { TimedDailySession } from './types.js';


export function finishSession(db: Kysely<Database>, endedAt: Date, userId: string, date: string) {
  return db
    .updateTable('daily_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
}

export async function findSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_results')
    .select([
      'date',
      'board',
      'found_words',
      'started_at',
      'ended_at',
      'points',
      'word_count',
      'longest_word',
      'time_limit',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .executeTakeFirst();
  return row ? parseTimedSession(row) : null;
}

export function insertSession(db: Kysely<Database>, userId: string, date: string, board: string[][], config: DailyConfig) {
  return db
    .insertInto('daily_results')
    .values({
      user_id: userId,
      date,
      board: JSON.stringify(board),
      found_words: JSON.stringify([]),
      board_size: config.boardSize,
      min_word_length: config.minWordLength,
      time_limit: config.timeLimit,
    })
    .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
    .execute();
}

export function saveWords(db: Kysely<Database>, result: WordProgress, userId: string, date: string) {
  return db
    .updateTable('daily_results')
    .set({
      found_words: JSON.stringify(result.nextWords),
      word_times: sql<Record<string, number>>`coalesce(word_times, '{}'::jsonb) || jsonb_build_object(${result.nextWords[result.nextWords.length - 1]}::text, greatest(0, extract(epoch from (clock_timestamp() - started_at))))`,
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
}

function parseTimedSession(row: {
  date: string;
  board: unknown;
  found_words: unknown;
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
}): TimedDailySession {
  const board = typeof row.board === 'string' ? JSON.parse(row.board) : (row.board as string[][]);
  const foundWords = typeof row.found_words === 'string'
    ? JSON.parse(row.found_words)
    : (row.found_words as string[]);
  return {
    date: row.date,
    board,
    found_words: foundWords,
    started_at: row.started_at,
    ended_at: row.ended_at,
    points: row.points,
    word_count: row.word_count,
    longest_word: row.longest_word,
    time_limit: row.time_limit,
  };
}

export async function lockSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_results')
    .select([
      'date',
      'board',
      'found_words',
      'started_at',
      'ended_at',
      'points',
      'word_count',
      'longest_word',
      'time_limit',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .forUpdate().executeTakeFirst();
  return row ? parseTimedSession(row) : null;
}
