import type { Kysely } from 'kysely';
import type { Position } from 'models';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { scoreWord } from 'engine/scoring.js';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { scoreResult } from './DailyService.js';
import { DAILY_RELAXED_BOARD_SIZE, DAILY_RELAXED_MIN_WORD_LENGTH } from './dailyRelaxedConfig.js';

export interface RelaxedSession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  last_active_at: Date;
  ended_at: Date | null;
  ended_by_player: boolean;
  points: number;
  word_count: number;
  longest_word: string;
}

export type SubmitOutcome =
  | { valid: true; word: string; score: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' };

function parseSession(row: {
  date: string;
  found_words: unknown;
  board: unknown;
  started_at: Date;
  last_active_at: Date;
  ended_at: Date | null;
  ended_by_player: boolean;
  points: number;
  word_count: number;
  longest_word: string;
}): RelaxedSession {
  const board = typeof row.board === 'string' ? JSON.parse(row.board) : (row.board as string[][]);
  const foundWords = typeof row.found_words === 'string'
    ? JSON.parse(row.found_words)
    : (row.found_words as string[]);
  return {
    date: row.date,
    board,
    found_words: foundWords,
    started_at: row.started_at,
    last_active_at: row.last_active_at,
    ended_at: row.ended_at,
    ended_by_player: row.ended_by_player,
    points: row.points,
    word_count: row.word_count,
    longest_word: row.longest_word,
  };
}

export async function getSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<RelaxedSession | null> {
  const row = await db
    .selectFrom('daily_relaxed_results')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .executeTakeFirst();
  return row ? parseSession(row) : null;
}

// Insert the session row on first interaction. The board is locked in at
// creation time so the player always sees the same puzzle on resume even
// if board generation logic changes within the day.
export async function startSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  board: string[][],
): Promise<RelaxedSession> {
  await db
    .insertInto('daily_relaxed_results')
    .values({
      user_id: userId,
      date,
      board: JSON.stringify(board),
      found_words: JSON.stringify([]),
    })
    .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
    .execute();

  const session = await getSession(db, userId, date);
  if (!session) throw new Error('Failed to start relaxed session');
  return session;
}

// Trust-but-verify: validate path, derive the word from the board, dictionary
// check, dedupe. Persists by writing the new found_words array back atomically.
export async function submitWord(
  db: Kysely<Database>,
  userId: string,
  date: string,
  path: Position[],
): Promise<SubmitOutcome> {
  const session = await getSession(db, userId, date);
  if (!session) return { valid: false, reason: 'invalid' };
  if (session.ended_at) return { valid: false, reason: 'ended' };

  if (!isValidPath(path, DAILY_RELAXED_BOARD_SIZE)) {
    return { valid: false, reason: 'invalid' };
  }

  const word = path
    .map((pos) => session.board[pos.row][pos.col])
    .join('')
    .toUpperCase();

  if (word.length < DAILY_RELAXED_MIN_WORD_LENGTH) {
    return { valid: false, reason: 'invalid' };
  }
  if (!isValidWord(dictionary, word.toLowerCase())) {
    return { valid: false, reason: 'invalid' };
  }
  if (session.found_words.some((w) => w.toUpperCase() === word)) {
    return { valid: false, reason: 'repeat' };
  }

  const nextWords = [...session.found_words, word];
  const { points, wordCount, longestWord } = scoreResult(nextWords);

  await db
    .updateTable('daily_relaxed_results')
    .set({
      found_words: JSON.stringify(nextWords),
      last_active_at: new Date(),
      points,
      word_count: wordCount,
      longest_word: longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();

  return { valid: true, word, score: scoreWord(word) };
}

export async function endSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<RelaxedSession | null> {
  await db
    .updateTable('daily_relaxed_results')
    .set({ ended_at: new Date(), ended_by_player: true })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  return getSession(db, userId, date);
}
