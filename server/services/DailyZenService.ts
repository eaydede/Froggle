import { sql, type Kysely } from 'kysely';
import type { Position } from 'models';
import { assignCompetitionRanks } from 'models/ranking';
import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import { validateSubmission } from 'engine/submission.js';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { getDisplayNames } from './displayNames.js';
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
  is_competitive: boolean;
  /** Sum of scoreWord() across every findable word on the board. Locked at
   *  session start so resumes never see a different ceiling. Null only on
   *  pre-rank rows that predate the column. */
  theoretical_max_score: number | null;
  active_seconds: number;
}

// Per-gap cap for active-time accumulation. If the gap between two word
// submissions exceeds this, only this much is credited — the rest is
// assumed to be a break. Chosen as a "reasonable thinking pause" for a
// word game; tune as needed.
export const ACTIVE_TIME_GAP_CAP_SECONDS = 60;

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
// if board generation logic changes within the day. The casual/competitive
// choice is also locked here — onConflict-do-nothing means a re-entry
// keeps the player's first choice for the day.
//
// theoretical_max_score is also frozen at start: it's the sum of every
// findable word's score on this board, which the client divides into to
// derive the player's rank. Computing once on insert avoids per-request
// solver work and guarantees the ceiling never shifts mid-day if the
// dictionary or scoring changes.
export async function startSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  board: string[][],
  isCompetitive: boolean,
): Promise<ZenSession> {
  const minWordLength = getDailyZenConfig(date).minWordLength;
  const allWords = findAllWords(board, dictionary, minWordLength);
  const theoreticalMaxScore = allWords.reduce((sum, w) => sum + scoreWord(w.word), 0);

  await db
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
  const result = validateSubmission(path, {
    board: session.board,
    foundWords: session.found_words,
    boardSize: config.boardSize,
    minWordLength: config.minWordLength,
    dictionary,
    scoreWord,
    score: scoreResult,
  });
  if (!result.valid) return { valid: false, reason: result.reason };

  // Gap-capped active-time accumulation: credit min(elapsed, CAP) seconds
  // for the gap since the last word submission. The cap prevents long
  // pauses (tab in the background, walked away) from inflating the
  // estimate. See ACTIVE_TIME_GAP_CAP_SECONDS for the chosen cap.
  const now = new Date();
  const gapSec = Math.max(
    0,
    Math.floor((now.getTime() - session.last_active_at.getTime()) / 1000),
  );
  const creditSec = Math.min(gapSec, ACTIVE_TIME_GAP_CAP_SECONDS);

  await db
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

  return { valid: true, word: result.word, score: result.score };
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
  config: {
    launchDate: string;
    today: string;
    windowDays?: number;
    includeDefinitions?: boolean;
  },
): Promise<DailyZenStatsResponse> {
  const {
    launchDate,
    today,
    windowDays = 30,
    includeDefinitions = true,
  } = config;

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

  const definitions = includeDefinitions
    ? await getDefinitions(Array.from(
      new Set(userRows.map((r) => r.longest_word).filter((w): w is string => !!w)),
    ))
    : new Map<string, DailyStatsDay['longestWordDefinition']>();

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

export interface ZenLeaderboardRanking {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  longestWord: string;
}

export interface ZenLeaderboardInProgressEntry {
  userId: string;
  displayName: string;
  isCompetitive: boolean;
}

export interface ZenLeaderboardCurrentPlayer {
  isCompetitive: boolean;
  ranked: boolean;
  /** True once the player has finalized their session (regardless of mode).
   *  The compare feature gates on this — casual finishers can compare too. */
  completed: boolean;
  rank: number | null;
  points: number;
  wordsFound: number;
  longestWord: string;
  totalRankedPlayers: number;
}

export interface ZenLeaderboardResult {
  puzzleNumber: number;
  totalPlayers: number;
  inProgressCount: number;
  avgScore: number;
  rankings: {
    points: ZenLeaderboardRanking[];
    words: ZenLeaderboardRanking[];
  };
  inProgressPlayers: ZenLeaderboardInProgressEntry[];
  currentPlayer: ZenLeaderboardCurrentPlayer | null;
}

export type ZenCompareError = 'unplayed' | 'opponent-missing' | 'forbidden';

export interface ZenComparePlayer {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: { word: string; score: number }[];
}

export interface ZenCompareResult {
  date: string;
  puzzleNumber: number;
  board: string[][];
  me: ZenComparePlayer;
  them: ZenComparePlayer;
  config: { boardSize: number; minWordLength: number; timeLimit: number };
}

// Side-by-side comparison of two finalized zen sessions. Both players must
// have ended_at set; mode (casual vs competitive) doesn't matter — the gate
// is "have they finished today's puzzle".
export async function getZenCompare(
  db: Kysely<Database>,
  date: string,
  meUserId: string,
  otherUserId: string,
): Promise<{ ok: true; data: ZenCompareResult } | { ok: false; error: ZenCompareError }> {
  if (otherUserId === meUserId) return { ok: false, error: 'forbidden' };

  const rows = await db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('date', '=', date)
    .where('user_id', 'in', [meUserId, otherUserId])
    .execute();

  const mine = rows.find((r) => r.user_id === meUserId);
  const theirs = rows.find((r) => r.user_id === otherUserId);

  if (!mine || mine.ended_at === null) return { ok: false, error: 'unplayed' };
  if (!theirs || theirs.ended_at === null) return { ok: false, error: 'opponent-missing' };

  const displayNames = await getDisplayNames([meUserId, otherUserId]);
  const meName = displayNames.get(meUserId) ?? 'Anonymous';
  const themName = displayNames.get(otherUserId) ?? 'Anonymous';

  const parse = (r: typeof rows[number]) => {
    const board: string[][] = typeof r.board === 'string' ? JSON.parse(r.board) : (r.board as string[][]);
    const words: string[] = typeof r.found_words === 'string'
      ? JSON.parse(r.found_words)
      : (r.found_words as string[]);
    return { board, words };
  };

  const me = parse(mine);
  const them = parse(theirs);
  const cfg = getDailyZenConfig(date);

  return {
    ok: true,
    data: {
      date,
      puzzleNumber: getDailyZenNumber(date),
      // Both players solve the same seeded board; either copy is fine.
      board: me.board,
      me: {
        userId: meUserId,
        displayName: meName,
        points: scoreWords(me.words),
        wordCount: me.words.length,
        foundWords: me.words.map((word) => ({ word, score: scoreWord(word) })),
      },
      them: {
        userId: otherUserId,
        displayName: themName,
        points: scoreWords(them.words),
        wordCount: them.words.length,
        foundWords: them.words.map((word) => ({ word, score: scoreWord(word) })),
      },
      config: { boardSize: cfg.boardSize, minWordLength: cfg.minWordLength, timeLimit: 0 },
    },
  };
}

// Builds the zen leaderboard payload. Only completed competitive rows are
// ranked; casual players and in-progress competitive players are excluded
// from the ranked lists. In-progress players (both modes) are surfaced as a
// score-less presence list so the page can show "X solving right now"
// without leaking mid-session scores.
export async function getZenLeaderboard(
  db: Kysely<Database>,
  date: string,
  requestingUserId: string | undefined,
): Promise<ZenLeaderboardResult> {
  const rows = await db
    .selectFrom('daily_zen_results')
    .selectAll()
    .where('date', '=', date)
    .execute();

  const displayNames = await getDisplayNames(rows.map((row) => row.user_id));
  const enriched = rows.map((row) => {
    const words = typeof row.found_words === 'string'
      ? (JSON.parse(row.found_words) as string[])
      : (row.found_words as string[]);
    const points = scoreWords(words);
    const wordCount = words.length;
    return {
      userId: row.user_id,
      displayName: displayNames.get(row.user_id) ?? 'Anonymous',
      points,
      wordCount,
      longestWord: row.longest_word,
      inProgress: row.ended_at === null,
      isCompetitive: row.is_competitive,
    };
  });

  const ranked = enriched.filter((e) => !e.inProgress && e.isCompetitive);
  // Casual in-progress players are excluded — they've opted out of the
  // leaderboard entirely, so showing them as "still solving" would imply a
  // future ranked appearance that never comes. They still count toward the
  // overall totalPlayers tally below.
  const inProgressPlayers: ZenLeaderboardInProgressEntry[] = enriched
    .filter((e) => e.inProgress && e.isCompetitive)
    .map((e) => ({
      userId: e.userId,
      displayName: e.displayName,
      isCompetitive: e.isCompetitive,
    }));

  // Competition ranking: players with equal scores share a rank. The secondary
  // sort key still orders the displayed list (so equal-point players appear in
  // a stable order), but it does not split their rank — two players who see the
  // same number see the same place, matching the daily/free-play leaderboards.
  const byPoints = assignCompetitionRanks(
    [...ranked].sort((a, b) => b.points - a.points || b.wordCount - a.wordCount),
    (e) => e.points,
  );
  const byWords = assignCompetitionRanks(
    [...ranked].sort((a, b) => b.wordCount - a.wordCount || b.points - a.points),
    (e) => e.wordCount,
  );

  let currentPlayer: ZenLeaderboardCurrentPlayer | null = null;
  if (requestingUserId) {
    const myRow = enriched.find((e) => e.userId === requestingUserId);
    if (myRow) {
      // Casual and in-progress players surface a row with rank=null so the
      // client can render the appropriate "not on the leaderboard" / "rank
      // shows when you finish" copy without an extra round-trip.
      let rank: number | null = null;
      let ranked = false;
      if (myRow.isCompetitive && !myRow.inProgress) {
        const entry = byPoints.find(({ item }) => item.userId === requestingUserId);
        if (entry) {
          rank = entry.rank;
          ranked = true;
        }
      }
      currentPlayer = {
        isCompetitive: myRow.isCompetitive,
        ranked,
        completed: !myRow.inProgress,
        rank,
        points: myRow.points,
        wordsFound: myRow.wordCount,
        longestWord: myRow.longestWord,
        totalRankedPlayers: byPoints.length,
      };
    }
  }

  // avgScore reflects the competition's typical finished score, so it
  // excludes casual players and in-progress zeroes that would otherwise
  // drag the mean down.
  const totalRankedPoints = ranked.reduce((sum, e) => sum + e.points, 0);
  const avgScore = ranked.length > 0 ? Math.round(totalRankedPoints / ranked.length) : 0;

  return {
    puzzleNumber: getDailyZenNumber(date),
    totalPlayers: enriched.length,
    inProgressCount: inProgressPlayers.length,
    avgScore,
    rankings: {
      points: byPoints.map(({ item: e, rank }) => ({
        rank,
        userId: e.userId,
        displayName: e.displayName,
        points: e.points,
        wordCount: e.wordCount,
        longestWord: e.longestWord,
      })),
      words: byWords.map(({ item: e, rank }) => ({
        rank,
        userId: e.userId,
        displayName: e.displayName,
        points: e.points,
        wordCount: e.wordCount,
        longestWord: e.longestWord,
      })),
    },
    inProgressPlayers,
    currentPlayer,
  };
}
