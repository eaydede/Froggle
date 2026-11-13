import { sql, type Kysely } from 'kysely';
import type { WordProgress } from '../../gameplay/types.js';
import type { Database } from '../../platform/database/types.js';
import type { TimeIsMoneySession } from './types.js';

export async function findSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_time_is_money_results')
    .select([
      'date',
      'board',
      'found_words',
      'started_at',
      'ended_at',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'min_word_length',
      'time_limit',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .executeTakeFirst();
  return row ? parseSession(row) : null;
}

export function insertSession(db: Kysely<Database>, userId: string, date: string, board: string[][], config: { boardSize: number; minWordLength: number; timeLimit: number; }) {
  return db
    .insertInto('daily_time_is_money_results')
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
    .updateTable('daily_time_is_money_results')
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

export function finishSession(db: Kysely<Database>, endedAt: Date, userId: string, date: string) {
  return db
    .updateTable('daily_time_is_money_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
}

export function listDateSessions(db: Kysely<Database>, date: string) {
  return db
    .selectFrom('daily_time_is_money_results')
    .select(['user_id', 'points', 'word_count'])
    .where('date', '=', date)
    .where('ended_at', 'is not', null)
    .orderBy('points', 'desc')
    .execute();
}

export function findComparisonSessions(db: Kysely<Database>, date: string, meUserId: string, otherUserId: string) {
  return db
    .selectFrom('daily_time_is_money_results')
    .select(['user_id', 'board', 'found_words', 'ended_at'])
    .where('date', '=', date)
    .where('user_id', 'in', [meUserId, otherUserId])
    .execute();
}

export function findRank(db: Kysely<Database>, date: string, userId: string) {
  return db
    .with('ranked', (qb) =>
      qb
        .selectFrom('daily_time_is_money_results')
        .select((eb) => [
          'user_id',
          sql<number>`rank() over (order by ${eb.ref('points')} desc)`.as('rank'),
        ])
        .where('date', '=', date)
        .where('ended_at', 'is not', null),
    )
    .selectFrom('ranked')
    .select('rank')
    .where('user_id', '=', userId)
    .executeTakeFirst();
}

function parseSession(row: {
  date: string;
  board: unknown;
  found_words: unknown;
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}): TimeIsMoneySession {
  return {
    date: row.date,
    board: parseJson<string[][]>(row.board, []),
    found_words: parseJson<string[]>(row.found_words, []),
    started_at: row.started_at,
    ended_at: row.ended_at,
    points: row.points,
    word_count: row.word_count,
    longest_word: row.longest_word,
    board_size: row.board_size,
    min_word_length: row.min_word_length,
    time_limit: row.time_limit,
  };
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
}

export async function lockSession(db: Kysely<Database>, userId: string, date: string) {
  const row = await db
    .selectFrom('daily_time_is_money_results')
    .select([
      'date',
      'board',
      'found_words',
      'started_at',
      'ended_at',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'min_word_length',
      'time_limit',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .forUpdate().executeTakeFirst();
  return row ? parseSession(row) : null;
}
