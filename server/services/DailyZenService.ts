import type { Kysely } from 'kysely';
import type { Position } from 'models';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { scoreWord } from 'engine/scoring.js';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import {
  scoreResult,
  scoreWords,
  getDefinitions,
  type DailyState,
  type DailyStatsDay,
} from './DailyService.js';
import {
  getDailyZenConfig,
  getDailyZenNumber,
} from './dailyZenConfig.js';

export interface ZenSession {
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
  };
}

export async function getSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<ZenSession | null> {
  const row = await db
    .selectFrom('daily_zen_results')
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
): Promise<ZenSession> {
  await db
    .insertInto('daily_zen_results')
    .values({
      user_id: userId,
      date,
      board: JSON.stringify(board),
      found_words: JSON.stringify([]),
    })
    .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
    .execute();

  const session = await getSession(db, userId, date);
  if (!session) throw new Error('Failed to start zen session');
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

  const config = getDailyZenConfig(date);

  if (!isValidPath(path, config.boardSize)) {
    return { valid: false, reason: 'invalid' };
  }

  const word = path
    .map((pos) => session.board[pos.row][pos.col])
    .join('')
    .toUpperCase();

  if (word.length < config.minWordLength) {
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
    .updateTable('daily_zen_results')
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
): Promise<ZenSession | null> {
  await db
    .updateTable('daily_zen_results')
    .set({ ended_at: new Date(), ended_by_player: true })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  return getSession(db, userId, date);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export interface DailyZenStatsResponse {
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}

// Per-day zen history for the date picker on the zen results / leaderboard
// pages. Mirrors `getDailyStats` in shape so the client can reuse the picker
// adapter, but skips streak/avg fields (zen intentionally doesn't track
// streaks) and stamp tiers (no podium model on zen yet).
export async function getDailyZenStats(
  db: Kysely<Database>,
  userId: string,
  config: { launchDate: string; today: string; windowDays?: number },
): Promise<DailyZenStatsResponse> {
  const { launchDate, today, windowDays = 30 } = config;

  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  const userRows = await db
    .selectFrom('daily_zen_results')
    .select(['date', 'found_words', 'longest_word', 'ended_at'])
    .where('user_id', '=', userId)
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .execute();

  const playerCountRows = await db
    .selectFrom('daily_zen_results')
    .select((eb) => ['date', eb.fn.countAll<number>().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .groupBy('date')
    .execute();

  const userByDate = new Map<string, typeof userRows[number]>();
  for (const row of userRows) userByDate.set(row.date, row);

  const playersByDate = new Map<string, number>();
  for (const row of playerCountRows) playersByDate.set(row.date, Number(row.players));

  const uniqueLongestWords = Array.from(
    new Set(userRows.map((r) => r.longest_word).filter((w): w is string => !!w)),
  );
  const definitions = await getDefinitions(uniqueLongestWords);

  const days: DailyStatsDay[] = [];
  for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
    const userRow = userByDate.get(d);
    const playersCount = playersByDate.get(d) ?? 0;
    const cfg = getDailyZenConfig(d);

    if (!userRow) {
      days.push({
        date: d,
        puzzleNumber: getDailyZenNumber(d),
        state: d === today ? 'unplayed' : 'missed',
        points: null,
        wordsFound: null,
        longestWord: null,
        longestWordDefinition: null,
        stampTier: null,
        playersCount,
        config: {
          boardSize: cfg.boardSize,
          minWordLength: cfg.minWordLength,
          timeLimit: 0,
        },
      });
      continue;
    }

    const words = typeof userRow.found_words === 'string'
      ? (JSON.parse(userRow.found_words) as string[])
      : (userRow.found_words as string[]);

    const state: DailyState = userRow.ended_at
      ? 'completed'
      : d === today
        ? 'unplayed'
        : 'missed';

    days.push({
      date: d,
      puzzleNumber: getDailyZenNumber(d),
      state,
      points: state === 'completed' ? scoreWords(words) : null,
      wordsFound: state === 'completed' ? words.length : null,
      longestWord: state === 'completed' ? userRow.longest_word : null,
      longestWordDefinition: state === 'completed'
        ? (definitions.get(userRow.longest_word.toLowerCase()) ?? null)
        : null,
      stampTier: null,
      playersCount,
      config: {
        boardSize: cfg.boardSize,
        minWordLength: cfg.minWordLength,
        timeLimit: 0,
      },
    });
  }

  return { windowStart, windowEnd, days };
}
