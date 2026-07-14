import { sql, type Kysely } from 'kysely';
import type { Position } from 'models';
import { scoreWord } from 'engine/scoring.js';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { validateSubmission } from 'engine/submission.js';
import { assignCompetitionRanks } from 'models/ranking';
import {
  EXPERIMENTAL_MODES,
  TIME_IS_MONEY_SECONDS_PER_POINT,
  goldenCell,
  type ExperimentalModeKey,
  type ExperimentalModeState,
  type VoteSentiment,
} from 'models/experimental';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { scoreResult } from './DailyService.js';
import { getDisplayNames } from './displayNames.js';
import { isTimedSessionExpired, timedExpiryInstant } from './sessionTiming.js';
import { prepareExperimentalBoard } from './experimentalConfig.js';
import { appendWordTimes, elapsedSeconds, parseWordTimes } from './wordTiming.js';

// Same buzzer-grace window the timed daily uses — a word fairly played as the
// clock hits zero can reach the server a few hundred ms late.
export const EXPERIMENTAL_GRACE_SECONDS = 2;

export interface ExperimentalSession {
  date: string;
  modeKey: ExperimentalModeKey;
  board: string[][];
  state: ExperimentalModeState;
  found_words: string[];
  word_times: (number | null)[];
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}

// A single scored word from a submission. Normal submissions produce one; a
// Golden Ticket submission that routes through the wildcard can produce many
// at once — one per letter that completes the frame into a valid word.
export interface ScoredWord {
  word: string;
  score: number;
}

// A submission now returns a *list* of scored words rather than a single word,
// so the Golden Ticket jackpot fits the same shape as a normal single-word
// find. `totalScore` is the sum of the list — split out so callers don't have
// to re-reduce it for the UI.
export type ExperimentalSubmitOutcome =
  | { valid: true; words: ScoredWord[]; totalScore: number; points: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' };

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
}

// ─── Mode twists ────────────────────────────────────────────────────────────
//
// The single point where an experimental mode diverges from a plain daily's
// clock: how long the countdown effectively runs. Everything else per-mode
// lives in submitExperimentalWord's branches below. Every mode without an
// override behaves like a plain timed daily.

// Effective countdown length. Time is Money adds a fixed number of seconds per
// point already banked, so the deadline grows as the player finds words; every
// other mode runs the plain base limit.
function effectiveTimeLimit(session: {
  modeKey: ExperimentalModeKey;
  time_limit: number;
  points: number;
}): number {
  if (session.modeKey === 'time-is-money') {
    return session.time_limit + session.points * TIME_IS_MONEY_SECONDS_PER_POINT;
  }
  return session.time_limit;
}

// ─── Session lifecycle ──────────────────────────────────────────────────────

function isExpired(session: ExperimentalSession, now: Date): boolean {
  return isTimedSessionExpired(
    session.started_at,
    effectiveTimeLimit(session),
    EXPERIMENTAL_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(session: ExperimentalSession): Date {
  return timedExpiryInstant(session.started_at, effectiveTimeLimit(session));
}

function parseSession(row: {
  date: string;
  mode_key: string;
  board: unknown;
  state: unknown;
  found_words: unknown;
  word_times: unknown;
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}): ExperimentalSession {
  return {
    date: row.date,
    modeKey: row.mode_key as ExperimentalModeKey,
    board: parseJson<string[][]>(row.board, []),
    state: parseJson<ExperimentalModeState>(row.state, {}),
    found_words: parseJson<string[]>(row.found_words, []),
    word_times: parseWordTimes(row.word_times),
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
  session: ExperimentalSession,
): Promise<ExperimentalSession> {
  if (session.ended_at || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await db
    .updateTable('experimental_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', session.date)
    .where('mode_key', '=', session.modeKey)
    .where('ended_at', 'is', null)
    .execute();
  return { ...session, ended_at: endedAt };
}

export async function getExperimentalSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
): Promise<ExperimentalSession | null> {
  const row = await db
    .selectFrom('experimental_results')
    .select([
      'date',
      'mode_key',
      'board',
      'state',
      'found_words',
      'word_times',
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
    .where('mode_key', '=', modeKey)
    .executeTakeFirst();
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, parseSession(row));
}

// Idempotent. Board is locked in at creation so resumes see the same puzzle.
export async function startExperimentalSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
): Promise<ExperimentalSession> {
  const prepared = prepareExperimentalBoard(modeKey, date);
  await db
    .insertInto('experimental_results')
    .values({
      user_id: userId,
      date,
      mode_key: modeKey,
      board: JSON.stringify(prepared.board),
      state: JSON.stringify(prepared.state),
      found_words: JSON.stringify([]),
      board_size: prepared.boardSize,
      min_word_length: prepared.minWordLength,
      time_limit: prepared.timeLimit,
    })
    .onConflict((oc) => oc.columns(['user_id', 'date', 'mode_key']).doNothing())
    .execute();

  const session = await getExperimentalSession(db, userId, date, modeKey);
  if (!session) throw new Error('Failed to start experimental session');
  return session;
}

// Internal branch return: the wire outcome plus the persistence payload so the
// DB write doesn't have to recompute the aggregates. Public `submit` strips
// the persist fields before returning.
type SubmissionBranch =
  | { valid: false; reason: 'invalid' | 'repeat' }
  | {
      valid: true;
      words: ScoredWord[];
      totalScore: number;
      nextWords: string[];
      aggregates: { points: number; wordCount: number; longestWord: string };
    };

// Recompute the aggregates from a full word list. Cheap: found_words is small.
// Used by the Golden Ticket branch where multiple words are appended at once —
// re-summing keeps a single source of truth for the stored points regardless
// of how many words the submission added.
function aggregatesFor(words: string[], currentLongest: string) {
  let points = 0;
  let longest = currentLongest;
  for (const word of words) {
    points += scoreWord(word);
    if (
      word.length > longest.length ||
      (word.length === longest.length && word < longest)
    ) {
      longest = word;
    }
  }
  return { points, wordCount: words.length, longestWord: longest };
}

// Golden Ticket submission: the drawn path routes through the wildcard center.
// Try every A..Z as the fill letter, keep the words that are (a) in the
// dictionary, (b) at or above the min length, and (c) not already found.
// Every accepted completion is scored normally by `scoreWord`.
function processGoldenSubmission(
  session: ExperimentalSession,
  path: Position[],
): SubmissionBranch {
  if (!isValidPath(path, session.board_size)) return { valid: false, reason: 'invalid' };

  const center = goldenCell(session.board_size);
  const centerIdx = path.findIndex((p) => p.row === center.row && p.col === center.col);
  if (centerIdx === -1) return { valid: false, reason: 'invalid' };

  const template = path.map((p) => session.board[p.row][p.col]);
  if (template.length < session.min_word_length) return { valid: false, reason: 'invalid' };

  const alreadyFound = new Set(session.found_words.map((w) => w.toUpperCase()));
  const completions: ScoredWord[] = [];
  for (let code = 0; code < 26; code++) {
    const letter = String.fromCharCode(65 + code);
    template[centerIdx] = letter;
    const candidate = template.join('').toUpperCase();
    if (alreadyFound.has(candidate)) continue;
    if (!isValidWord(dictionary, candidate.toLowerCase())) continue;
    completions.push({ word: candidate, score: scoreWord(candidate) });
    alreadyFound.add(candidate);
  }

  if (completions.length === 0) return { valid: false, reason: 'invalid' };

  const nextWords = [...session.found_words, ...completions.map((c) => c.word)];
  return {
    valid: true,
    words: completions,
    totalScore: completions.reduce((sum, c) => sum + c.score, 0),
    nextWords,
    aggregates: aggregatesFor(nextWords, session.longest_word),
  };
}

// Normal submission: single-word path, no wildcards. Wraps the shared engine
// validator to fit the branch shape.
function processNormalSubmission(
  session: ExperimentalSession,
  path: Position[],
): SubmissionBranch {
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
  return {
    valid: true,
    words: [{ word: result.word, score: result.score }],
    totalScore: result.score,
    nextWords: result.nextWords,
    aggregates: {
      points: result.aggregate.points,
      wordCount: result.aggregate.wordCount,
      longestWord: result.aggregate.longestWord,
    },
  };
}

export async function submitExperimentalWord(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
  path: Position[],
): Promise<ExperimentalSubmitOutcome> {
  const session = await getExperimentalSession(db, userId, date, modeKey);
  if (!session) return { valid: false, reason: 'invalid' };
  if (session.ended_at) return { valid: false, reason: 'ended' };

  // Golden Ticket routes to the wildcard branch when the path touches the
  // center, otherwise falls through to the normal validator. A path spelling
  // the raw marker inline hits the normal branch and fails its dictionary
  // check (no real word contains the marker), so it can't sneak through.
  const center = goldenCell(session.board_size);
  const isGolden =
    modeKey === 'golden-ticket' &&
    path.some((p) => p.row === center.row && p.col === center.col);

  const branch = isGolden
    ? processGoldenSubmission(session, path)
    : processNormalSubmission(session, path);

  if (!branch.valid) return { valid: false, reason: branch.reason };

  const wordTimes = appendWordTimes(
    session.word_times,
    session.found_words.length,
    branch.nextWords.length - session.found_words.length,
    elapsedSeconds(session.started_at),
  );

  await db
    .updateTable('experimental_results')
    .set({
      found_words: JSON.stringify(branch.nextWords),
      word_times: JSON.stringify(wordTimes),
      points: branch.aggregates.points,
      word_count: branch.aggregates.wordCount,
      longest_word: branch.aggregates.longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('mode_key', '=', modeKey)
    .where('ended_at', 'is', null)
    .execute();

  return {
    valid: true,
    words: branch.words,
    totalScore: branch.totalScore,
    points: branch.aggregates.points,
  };
}

export async function endExperimentalSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
): Promise<ExperimentalSession | null> {
  const session = await getExperimentalSession(db, userId, date, modeKey);
  if (!session) return null;
  if (session.ended_at) return session;

  const now = new Date();
  const cap = expiryInstant(session);
  const endedAt = now > cap ? cap : now;

  await db
    .updateTable('experimental_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('mode_key', '=', modeKey)
    .where('ended_at', 'is', null)
    .execute();
  return getExperimentalSession(db, userId, date, modeKey);
}

// ─── Ranking ────────────────────────────────────────────────────────────────
//
// Points-based, shared with every other mode. Time is Money's "time survived"
// is base + points, which orders identically to points, so the same ranking
// serves both the points and time-survived headline stats.

export interface ExperimentalRosterEntry {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  rank: number;
  isYou: boolean;
}

export async function getExperimentalRoster(
  db: Kysely<Database>,
  date: string,
  modeKey: ExperimentalModeKey,
  meUserId: string,
): Promise<ExperimentalRosterEntry[]> {
  const rows = await db
    .selectFrom('experimental_results')
    .select(['user_id', 'points', 'word_count'])
    .where('date', '=', date)
    .where('mode_key', '=', modeKey)
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

// ─── Hub status ─────────────────────────────────────────────────────────────
//
// Per-mode completion state for the hub tiles: unplayed / in-progress /
// completed, plus the headline value + rank for completed modes so the tile can
// show a result line and a podium badge.

export type ExperimentalTileState = 'unplayed' | 'in-progress' | 'completed';

export interface ExperimentalModeStatus {
  modeKey: ExperimentalModeKey;
  state: ExperimentalTileState;
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  playersCount: number;
}

// Auto-finalize any of this user's open experimental sessions for the day
// whose timers have run out. Mirrors `getExperimentalSession`'s
// auto-finalize so a player who walked away after the clock hit zero sees
// the mode land in "completed" on the hub next time they look — not stuck
// as "in-progress" and missing from ranks / player counts. Called at the
// top of `getExperimentalStatus` so the ranking queries below observe the
// newly-finalized rows.
async function autoFinalizeExpiredForUser(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<void> {
  const openRows = await db
    .selectFrom('experimental_results')
    .select(['mode_key', 'started_at', 'time_limit', 'points'])
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  if (openRows.length === 0) return;

  const now = new Date();
  for (const row of openRows) {
    const modeKey = row.mode_key as ExperimentalModeKey;
    const forExpiry = {
      modeKey,
      time_limit: row.time_limit,
      points: row.points,
    };
    if (
      !isTimedSessionExpired(
        row.started_at,
        effectiveTimeLimit(forExpiry),
        EXPERIMENTAL_GRACE_SECONDS,
        now,
      )
    ) {
      continue;
    }
    const endedAt = timedExpiryInstant(row.started_at, effectiveTimeLimit(forExpiry));
    await db
      .updateTable('experimental_results')
      .set({ ended_at: endedAt, completed_at: endedAt })
      .where('user_id', '=', userId)
      .where('date', '=', date)
      .where('mode_key', '=', modeKey)
      .where('ended_at', 'is', null)
      .execute();
  }
}

export async function getExperimentalStatus(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<ExperimentalModeStatus[]> {
  await autoFinalizeExpiredForUser(db, userId, date);

  // Rank + player count per mode for the day, computed in one pass over the
  // finalized rows so completed tiles can show a podium badge without a
  // per-mode roster round-trip.
  const rankedRows = await db
    .with('ranked', (qb) =>
      qb
        .selectFrom('experimental_results')
        .select((eb) => [
          'user_id',
          'mode_key',
          'points',
          'word_count',
          sql<number>`rank() over (partition by ${eb.ref('mode_key')} order by ${eb.ref('points')} desc)`.as('rank'),
          sql<number>`count(*) over (partition by ${eb.ref('mode_key')})`.as('players'),
        ])
        .where('date', '=', date)
        .where('ended_at', 'is not', null),
    )
    .selectFrom('ranked')
    .selectAll()
    .where('user_id', '=', userId)
    .execute();

  const playerCounts = await db
    .selectFrom('experimental_results')
    .select((eb) => ['mode_key', eb.fn.countAll<number>().as('players')])
    .where('date', '=', date)
    .where('ended_at', 'is not', null)
    .groupBy('mode_key')
    .execute();
  const playersByMode = new Map(playerCounts.map((r) => [r.mode_key, Number(r.players)]));

  // In-progress detection: a row exists but hasn't been finalized.
  const openRows = await db
    .selectFrom('experimental_results')
    .select('mode_key')
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  const openModes = new Set(openRows.map((r) => r.mode_key));

  const myRankByMode = new Map(rankedRows.map((r) => [r.mode_key, r]));

  return Object.values(EXPERIMENTAL_MODES).map((meta) => {
    const done = myRankByMode.get(meta.key);
    if (done) {
      return {
        modeKey: meta.key,
        state: 'completed' as const,
        points: done.points,
        wordCount: done.word_count,
        rank: Number(done.rank),
        playersCount: playersByMode.get(meta.key) ?? 0,
      };
    }
    return {
      modeKey: meta.key,
      state: openModes.has(meta.key) ? ('in-progress' as const) : ('unplayed' as const),
      points: null,
      wordCount: null,
      rank: null,
      playersCount: playersByMode.get(meta.key) ?? 0,
    };
  });
}

// ─── Voting ─────────────────────────────────────────────────────────────────

// All-time tally of votes for one experimental mode. Aggregating over every
// day the mode has ever run — the vote is about the *mode's design*, not any
// single day's puzzle, so we want the broader signal that survives thin days.
export interface ExperimentalVoteTallies {
  up: number;
  meh: number;
  down: number;
}

export async function getExperimentalVoteTallies(
  db: Kysely<Database>,
  modeKey: ExperimentalModeKey,
): Promise<ExperimentalVoteTallies> {
  const rows = await db
    .selectFrom('experimental_votes')
    .select((eb) => ['sentiment', eb.fn.countAll<number>().as('count')])
    .where('mode_key', '=', modeKey)
    .groupBy('sentiment')
    .execute();
  const tallies: ExperimentalVoteTallies = { up: 0, meh: 0, down: 0 };
  for (const row of rows) {
    const sentiment = row.sentiment as VoteSentiment;
    if (sentiment in tallies) tallies[sentiment] = Number(row.count);
  }
  return tallies;
}

export async function getExperimentalVote(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
): Promise<VoteSentiment | null> {
  const row = await db
    .selectFrom('experimental_votes')
    .select('sentiment')
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('mode_key', '=', modeKey)
    .executeTakeFirst();
  return (row?.sentiment as VoteSentiment | undefined) ?? null;
}

// Upsert so a player can change their mind within the day. One row per
// (user, date, mode) is enforced by the unique constraint.
export async function castExperimentalVote(
  db: Kysely<Database>,
  userId: string,
  date: string,
  modeKey: ExperimentalModeKey,
  sentiment: VoteSentiment,
): Promise<void> {
  await db
    .insertInto('experimental_votes')
    .values({ user_id: userId, date, mode_key: modeKey, sentiment })
    .onConflict((oc) =>
      oc
        .columns(['user_id', 'date', 'mode_key'])
        .doUpdateSet({ sentiment, updated_at: new Date() }),
    )
    .execute();
}
