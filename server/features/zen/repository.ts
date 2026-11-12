import { sql, type Kysely } from 'kysely';
import type { WordProgress } from '../../gameplay/types.js';
import type { Database } from '../../platform/database/types.js';
import type { ZenSession } from './types.js';


export async function findSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .executeTakeFirst();
  return row ? parseSession(row) : null;
}

export function insertSession(db: Kysely<Database>, userId: string, date: string, board: string[][], isCompetitive: boolean, theoreticalMaxScore: number) {
  return db
    .insertInto('daily_zen_results')
    .values({
      user_id: userId,
      date,
      board: JSON.stringify(board),
      found_words: JSON.stringify([]),
      is_competitive: isCompetitive,
      theoretical_max_score: theoreticalMaxScore,
    })
    .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
    .execute();
}

export function saveWords(db: Kysely<Database>, result: WordProgress, now: Date, creditSec: number, userId: string, date: string) {
  return db
    .updateTable('daily_zen_results')
    .set({
      found_words: JSON.stringify(result.nextWords),
      last_active_at: now,
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
      active_seconds: sql<number>`active_seconds + ${creditSec}`,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
}

export function finishSession(db: Kysely<Database>, userId: string, date: string, endedAt: Date) {
  return db
    .updateTable('daily_zen_results')
    .set({ ended_at: endedAt, ended_by_player: true })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
}

export function listUserHistory(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_zen_results')
    .select(['date', 'found_words', 'longest_word', 'ended_at'])
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();
}

export function countPlayers(db: Kysely<Database>, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_zen_results')
    .select((eb) => ['date', eb.fn.countAll<number>().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .groupBy('date')
    .execute();
}

export function findComparisonSessions(db: Kysely<Database>, date: string, meUserId: string, otherUserId: string) {
  return db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('date', '=', date)
    .where('user_id', 'in', [meUserId, otherUserId])
    .execute();
}

export function listDateSessions(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('date', '=', date)
    .execute();
}

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
  is_competitive: boolean;
  theoretical_max_score: number | null;
  active_seconds: number;
}): ZenSession {
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
    is_competitive: row.is_competitive,
    theoretical_max_score: row.theoretical_max_score,
    active_seconds: row.active_seconds,
  };
}

export async function lockSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .forUpdate().executeTakeFirst();
  return row ? parseSession(row) : null;
}
