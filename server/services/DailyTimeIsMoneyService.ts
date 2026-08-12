import { sql, type Kysely } from 'kysely';
import type { Position } from 'models';
import { scoreWord } from 'engine/scoring.js';
import { validateSubmission } from 'engine/submission.js';
import { assignCompetitionRanks } from 'models/ranking';
import { TIME_IS_MONEY_CONFIG, TIME_IS_MONEY_SECONDS_PER_POINT } from 'models/timeIsMoney';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { scoreResult } from './DailyService.js';
import { getDisplayNames } from './displayNames.js';
import { isTimedSessionExpired, timedExpiryInstant } from './sessionTiming.js';
import { prepareTimeIsMoneyBoard } from './timeIsMoneyConfig.js';

// Same buzzer-grace window the timed daily uses — a word fairly played as the
// clock hits zero can reach the server a few hundred ms late.
export const TIME_IS_MONEY_GRACE_SECONDS = 2;

export interface TimeIsMoneySession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}

export type TimeIsMoneySubmitOutcome =
  | { valid: true; word: string; score: number; points: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' };

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
}

// ─── Session lifecycle ──────────────────────────────────────────────────────

// The mode's one twist: the countdown grows as points bank, so the deadline is
// a function of the score rather than a fixed length.
function effectiveTimeLimit(session: { time_limit: number; points: number }): number {
  return session.time_limit + session.points * TIME_IS_MONEY_SECONDS_PER_POINT;
}

function isExpired(session: TimeIsMoneySession, now: Date): boolean {
  return isTimedSessionExpired(
    session.started_at,
    effectiveTimeLimit(session),
    TIME_IS_MONEY_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(session: TimeIsMoneySession): Date {
  return timedExpiryInstant(session.started_at, effectiveTimeLimit(session));
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

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  userId: string,
  session: TimeIsMoneySession,
): Promise<TimeIsMoneySession> {
  if (session.ended_at || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await db
    .updateTable('daily_time_is_money_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', session.date)
    .where('ended_at', 'is', null)
    .execute();
  return { ...session, ended_at: endedAt };
}

export async function getTimeIsMoneySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneySession | null> {
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
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, parseSession(row));
}

// Idempotent. Board is locked in at creation so resumes see the same puzzle.
export async function startTimeIsMoneySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneySession> {
  await db
    .insertInto('daily_time_is_money_results')
    .values({
      user_id: userId,
      date,
      board: JSON.stringify(prepareTimeIsMoneyBoard(date)),
      found_words: JSON.stringify([]),
      board_size: TIME_IS_MONEY_CONFIG.boardSize,
      min_word_length: TIME_IS_MONEY_CONFIG.minWordLength,
      time_limit: TIME_IS_MONEY_CONFIG.timeLimit,
    })
    .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
    .execute();

  const session = await getTimeIsMoneySession(db, userId, date);
  if (!session) throw new Error('Failed to start Time is Money session');
  return session;
}

export async function submitTimeIsMoneyWord(
  db: Kysely<Database>,
  userId: string,
  date: string,
  path: Position[],
): Promise<TimeIsMoneySubmitOutcome> {
  const session = await getTimeIsMoneySession(db, userId, date);
  if (!session) return { valid: false, reason: 'invalid' };
  if (session.ended_at) return { valid: false, reason: 'ended' };

  const result = validateSubmission(path, {
    board: session.board,
    foundWords: session.found_words,
    boardSize: session.board_size,
    minWordLength: session.min_word_length,
    dictionary,
    scoreWord,
    score: scoreResult,
  });
  if (!result.valid) return { valid: false, reason: result.reason };

  await db
    .updateTable('daily_time_is_money_results')
    .set({
      found_words: JSON.stringify(result.nextWords),
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();

  return {
    valid: true,
    word: result.word,
    score: result.score,
    points: result.aggregate.points,
  };
}

export async function endTimeIsMoneySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneySession | null> {
  const session = await getTimeIsMoneySession(db, userId, date);
  if (!session) return null;
  if (session.ended_at) return session;

  const now = new Date();
  const cap = expiryInstant(session);
  const endedAt = now > cap ? cap : now;

  await db
    .updateTable('daily_time_is_money_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  return getTimeIsMoneySession(db, userId, date);
}

// ─── Ranking ────────────────────────────────────────────────────────────────
//
// Points-based, shared with every other mode. "Time survived" is base + points,
// which orders identically to points, so the same ranking serves the
// time-survived headline the results screen shows.

export interface TimeIsMoneyRosterEntry {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  rank: number;
  isYou: boolean;
}

export async function getTimeIsMoneyRoster(
  db: Kysely<Database>,
  date: string,
  meUserId: string,
): Promise<TimeIsMoneyRosterEntry[]> {
  const rows = await db
    .selectFrom('daily_time_is_money_results')
    .select(['user_id', 'points', 'word_count'])
    .where('date', '=', date)
    .where('ended_at', 'is not', null)
    .orderBy('points', 'desc')
    .execute();
  if (rows.length === 0) return [];

  const displayNames = await getDisplayNames(rows.map((r) => r.user_id));
  const ranked = assignCompetitionRanks(rows, (r) => r.points);
  return ranked.map(({ item, rank }) => ({
    userId: item.user_id,
    displayName: displayNames.get(item.user_id) ?? 'Anonymous',
    points: item.points,
    wordCount: item.word_count,
    rank,
    isYou: item.user_id === meUserId,
  }));
}

// ─── Landing status ─────────────────────────────────────────────────────────

export type TimeIsMoneyState = 'unplayed' | 'in-progress' | 'completed';

export interface TimeIsMoneyStatus {
  state: TimeIsMoneyState;
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  // The run's own starting clock, so the card can show the time it bought
  // without assuming today's config. Null when there's no run yet.
  timeLimit: number | null;
}

export async function getTimeIsMoneyStatus(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneyStatus> {
  // A player who walked away after the clock hit zero would otherwise stay
  // stuck at "in-progress" and sit outside the day's ranks. Finalizing here
  // means the rank query below observes the freshly-closed row.
  const session = await getTimeIsMoneySession(db, userId, date);
  if (!session) {
    return { state: 'unplayed', points: null, wordCount: null, rank: null, timeLimit: null };
  }
  if (!session.ended_at) {
    return {
      state: 'in-progress',
      points: session.points,
      wordCount: session.word_count,
      rank: null,
      timeLimit: session.time_limit,
    };
  }

  const ranked = await db
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

  return {
    state: 'completed',
    points: session.points,
    wordCount: session.word_count,
    rank: ranked ? Number(ranked.rank) : null,
    timeLimit: session.time_limit,
  };
}
