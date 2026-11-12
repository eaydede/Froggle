import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import { validateSubmission } from 'engine/submission.js';
import { type Kysely } from 'kysely';
import type { Position } from 'models';
import { assignCompetitionRanks } from 'models/ranking';
import { dictionary } from '../../gameplay/dictionary.js';
import { scoreResult, scoreWords } from '../../gameplay/scoring.js';
import type { Database } from '../../platform/database/types.js';
import { type DailyState, type DailyStatsDay } from '../daily-history/types.js';
import { getDefinitions } from '../definitions/service.js';
import { getDisplayNames } from '../profile/publicNames.js';
import { getDailyZenConfig, getDailyZenNumber } from './config.js';
import * as repository from './repository.js';
import type { DailyZenStatsResponse, SubmitOutcome, ZenCompareError, ZenCompareResult, ZenLeaderboardCurrentPlayer, ZenLeaderboardInProgressEntry, ZenLeaderboardResult, ZenSession } from './types.js';

// Per-gap cap for active-time accumulation. If the gap between two word
// submissions exceeds this, only this much is credited — the rest is
// assumed to be a break. Chosen as a "reasonable thinking pause" for a
// word game; tune as needed.
export const ACTIVE_TIME_GAP_CAP_SECONDS = 60;

export async function getSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<ZenSession | null> {
  const row = await repository.findSession(db, userId, date);
  return row ? row : null;
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

  await repository.insertSession(db, userId, date, board, isCompetitive, theoreticalMaxScore);

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
  return db.transaction().execute(async trx => {
    const session = await repository.lockSession(trx, userId, date);
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

    await repository.saveWords(trx, result, now, creditSec, userId, date);

    return { valid: true, word: result.word, score: result.score };

  });
}

export async function endSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<ZenSession | null> {
  await repository.finishSession(db, userId, date, new Date());
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

  const userRows = await repository.listUserHistory(db, userId, windowStart, windowEnd);

  const playerCountRows = await repository.countPlayers(db, windowStart, windowEnd);

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

// Side-by-side comparison of two finalized zen sessions. Both players must
// have ended_at set; mode (casual vs competitive) doesn't matter — the gate
// is "have they finished today's puzzle".
export async function getZenCompare(
  db: Kysely<Database>,
  date: string,
  meUserId: string,
  otherUserId: string,
): Promise<{ ok: true; data: ZenCompareResult; } | { ok: false; error: ZenCompareError; }> {
  if (otherUserId === meUserId) return { ok: false, error: 'forbidden' };

  const rows = await repository.findComparisonSessions(db, date, meUserId, otherUserId);

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
  const rows = await repository.listDateSessions(db, date);

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
