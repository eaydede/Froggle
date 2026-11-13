import { sql, type Kysely } from 'kysely';
import {
  type GauntletModifier,
  type GauntletRoundKind
} from 'models/gauntlet';
import type { WordProgress } from '../../gameplay/types.js';
import type { Database } from '../../platform/database/types.js';
import type { PreparedGauntletRound } from './config.js';
import type { GauntletRoundSession } from './types.js';

export async function findSession(db: Kysely<Database>, userId: string, date: string, roundIndex: number) {
  const row = await db
    .selectFrom('daily_gauntlet_results')
    .select([
      'date',
      'round_index',
      'round_kind',
      'board',
      'modifier',
      'found_words',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'min_word_length',
      'time_limit',
      'started_at',
      'ended_at',
      'completed_at',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .executeTakeFirst();
  return row ? parseSessionRow(row) : null;
}

export async function listUserRounds(db: Kysely<Database>, userId: string, date: string) {
  const rows = await db
    .selectFrom('daily_gauntlet_results')
    .select([
      'date',
      'round_index',
      'round_kind',
      'board',
      'modifier',
      'found_words',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'min_word_length',
      'time_limit',
      'started_at',
      'ended_at',
      'completed_at',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .execute();
  return rows.map(parseSessionRow);
}

export function insertSession(db: Kysely<Database>, userId: string, date: string, roundIndex: number, prepared: PreparedGauntletRound) {
  return db
    .insertInto('daily_gauntlet_results')
    .values({
      user_id: userId,
      date,
      round_index: roundIndex,
      round_kind: prepared.config.kind,
      board: JSON.stringify(prepared.board),
      modifier: JSON.stringify(prepared.config.modifier),
      found_words: JSON.stringify([]),
      board_size: prepared.config.boardSize,
      min_word_length: prepared.config.minWordLength,
      time_limit: prepared.config.timeLimit,
    })
    .onConflict((oc) => oc.columns(['user_id', 'date', 'round_index']).doNothing())
    .execute();
}

export function saveWords(db: Kysely<Database>, result: WordProgress, userId: string, date: string, roundIndex: number) {
  return db
    .updateTable('daily_gauntlet_results')
    .set({
      found_words: JSON.stringify(result.nextWords),
      word_times: sql<Record<string, number>>`coalesce(word_times, '{}'::jsonb) || jsonb_build_object(${result.nextWords[result.nextWords.length - 1]}::text, greatest(0, extract(epoch from (clock_timestamp() - started_at))))`,
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .where('ended_at', 'is', null)
    .execute();
}

export function finishSession(db: Kysely<Database>, endedAt: Date, userId: string, date: string, roundIndex: number) {
  return db
    .updateTable('daily_gauntlet_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .where('ended_at', 'is', null)
    .execute();
}

export function listRoundRanks(db: Kysely<Database>, date: string) {
  return db
    .with('ranked', (qb) =>
      qb
        .selectFrom('daily_gauntlet_results')
        .select((eb) => [
          'user_id',
          'date',
          'round_index',
          'points',
          'word_count',
          'completed_at',
          sql<number>`rank() over (partition by ${eb.ref('round_index')} order by ${eb.ref('points')} desc)`.as('rank'),
        ])
        .where('date', '=', date)
        .where('ended_at', 'is not', null),
    )
    .selectFrom('ranked')
    .select(['user_id', 'date', 'round_index', 'points', 'word_count', 'completed_at', 'rank'])
    .execute();
}

export function listUserHistory(db: Kysely<Database>, userId: string, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_gauntlet_results')
    .select(['date', 'points', 'word_count', 'ended_at'])
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();
}

export function countPlayers(db: Kysely<Database>, windowStart: string, windowEnd: string) {
  return db
    .selectFrom('daily_gauntlet_results')
    .select((eb) => ['date', eb.fn.count(eb.ref('user_id')).distinct().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .groupBy('date')
    .execute();
}

function parseSessionRow(row: {
  date: string;
  round_index: number;
  round_kind: string;
  board: unknown;
  modifier: unknown;
  found_words: unknown;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
  started_at: Date;
  ended_at: Date | null;
  completed_at: Date | null;
}): GauntletRoundSession {
  const board = typeof row.board === 'string' ? JSON.parse(row.board) : (row.board as string[][]);
  const modifier = typeof row.modifier === 'string'
    ? JSON.parse(row.modifier)
    : (row.modifier as GauntletModifier);
  const foundWords = typeof row.found_words === 'string'
    ? JSON.parse(row.found_words)
    : (row.found_words as string[]);
  return {
    date: row.date,
    roundIndex: row.round_index,
    roundKind: row.round_kind as GauntletRoundKind,
    board,
    modifier,
    config: {
      boardSize: row.board_size,
      timeLimit: row.time_limit,
      minWordLength: row.min_word_length,
    },
    foundWords,
    points: row.points,
    wordCount: row.word_count,
    longestWord: row.longest_word,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    completedAt: row.completed_at,
  };
}

export async function lockSession(db: Kysely<Database>, userId: string, date: string, roundIndex: number) {
  const row = await db
    .selectFrom('daily_gauntlet_results')
    .select([
      'date',
      'round_index',
      'round_kind',
      'board',
      'modifier',
      'found_words',
      'points',
      'word_count',
      'longest_word',
      'board_size',
      'min_word_length',
      'time_limit',
      'started_at',
      'ended_at',
      'completed_at',
    ])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .forUpdate().executeTakeFirst();
  return row ? parseSessionRow(row) : null;
}
