import { sql, type Kysely } from 'kysely';
import type { Position } from 'models';
import { scoreWord } from 'engine/scoring.js';
import { validateSubmission } from 'engine/submission.js';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { getDailyConfig, type DailyConfig } from './dailyConfig.js';
import { isTimedSessionExpired, timedExpiryInstant } from './sessionTiming.js';
import { appendWordTimes, elapsedSeconds, parseWordTimes } from './wordTiming.js';

export interface ScoredResult {
  points: number;
  wordCount: number;
  longestWord: string;
}

// Sums the per-word scores of a word list. Callers that only need the point
// total share this helper instead of reimplementing the reduce inline.
export function scoreWords(foundWords: string[]): number {
  let points = 0;
  for (const word of foundWords) points += scoreWord(word);
  return points;
}

// Computes the aggregates that get persisted alongside a daily_results row.
// Longest-word tiebreak is alphabetical ascending so the stored value is stable
// regardless of the order words were found in.
export function scoreResult(foundWords: string[]): ScoredResult {
  let longestWord = '';
  for (const word of foundWords) {
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points: scoreWords(foundWords), wordCount: foundWords.length, longestWord };
}

// ─── Definition lookup ────────────────────────────────────────────────────
//
// Mirrors the WordDefinition shape the results page already renders
// (client/src/pages/results/hooks/useDefinition.ts) so the Daily page and
// Results page can share a single component tree for definition display.

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string }>;
  }>;
}

// Module-level cache. Shared across all users and requests; warms back up on
// restart. No TTL — definitions don't change and the space of "daily longest
// words" is naturally bounded. `null` is cached too so repeated lookups of a
// word neither API knows don't re-fetch.
const definitionCache = new Map<string, WordDefinition | null>();

function parsePrimaryApi(data: unknown): WordDefinition | null {
  const d = data as {
    word: string;
    entries?: {
      partOfSpeech: string;
      pronunciations?: { text?: string }[];
      senses: { definition: string; examples?: string[] }[];
    }[];
  };
  if (!d || !d.entries || d.entries.length === 0) return null;

  const phonetic = d.entries[0]?.pronunciations?.find((p) => p.text)?.text;
  const seen = new Set<string>();
  const meanings: WordDefinition['meanings'] = [];
  for (const entry of d.entries) {
    if (seen.has(entry.partOfSpeech)) continue;
    seen.add(entry.partOfSpeech);
    meanings.push({
      partOfSpeech: entry.partOfSpeech,
      definitions: entry.senses.slice(0, 2).map((s) => ({
        definition: s.definition,
        example: s.examples?.[0],
      })),
    });
  }
  return { word: d.word, phonetic, meanings };
}

function parseFallbackApi(data: unknown): WordDefinition | null {
  const arr = data as {
    word: string;
    phonetic?: string;
    phonetics?: { text?: string }[];
    meanings: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string }[];
    }[];
  }[];
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const entry = arr[0];
  return {
    word: entry.word,
    phonetic: entry.phonetic || entry.phonetics?.find((p) => p.text)?.text,
    meanings: entry.meanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 2).map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
    })),
  };
}

async function fetchDefinitionUncached(word: string): Promise<WordDefinition | null> {
  try {
    const res = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const parsed = parsePrimaryApi(await res.json());
      if (parsed) return parsed;
    }
  } catch {
    // Primary failed or timed out; fall through to the backup.
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) return parseFallbackApi(await res.json());
  } catch {
    // Both APIs failed — treat the word as undefinable.
  }

  return null;
}

export async function getDefinitions(words: string[]): Promise<Map<string, WordDefinition | null>> {
  const result = new Map<string, WordDefinition | null>();
  const misses: string[] = [];

  for (const raw of words) {
    const w = raw.toLowerCase();
    if (result.has(w)) continue;
    if (definitionCache.has(w)) {
      result.set(w, definitionCache.get(w)!);
    } else {
      misses.push(w);
    }
  }

  // Parallel so total latency ≈ slowest single call, not sum of all calls.
  const fetched = await Promise.all(
    misses.map(async (w) => [w, await fetchDefinitionUncached(w)] as const),
  );
  for (const [w, def] of fetched) {
    definitionCache.set(w, def);
    result.set(w, def);
  }
  return result;
}

// ─── Stats endpoint ───────────────────────────────────────────────────────

export type DailyState = 'completed' | 'missed' | 'unplayed';
export type StampTier = 'first' | 'second' | 'third' | 'top30' | null;

export interface DailyStatsDay {
  date: string;
  puzzleNumber: number;
  state: DailyState;
  points: number | null;
  wordsFound: number | null;
  longestWord: string | null;
  longestWordDefinition: WordDefinition | null;
  stampTier: StampTier;
  playersCount: number;
  config: DailyConfig;
}

export interface DailyStatsResponse {
  currentStreak: number;
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}

export interface DailyStatsConfig {
  launchDate: string;
  today: string;
  getPuzzleNumber: (date: string) => number;
  windowDays?: number;
  includeDefinitions?: boolean;
}

// Pure PST calendar arithmetic on YYYY-MM-DD strings. Noon UTC avoids
// any DST edge cases when adding days.
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

// Consecutive played days ending at today, walking backward over real
// calendar dates. Today being unplayed does not break the streak (the user
// may not have played yet); the first prior gap ends it. Bounded only by
// launchDate, never by the history window — so a 100-day streak reads as 100,
// not as the window ceiling. This is the regression guard against the
// "streak caps at the window size" bug; keep it independent of windowDays.
export function computeStreak(
  playedDates: Set<string>,
  today: string,
  launchDate: string,
): number {
  let streak = 0;
  let cursor = playedDates.has(today) ? today : addDays(today, -1);
  while (cursor >= launchDate && playedDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function stampTierFor(rank: number, totalPlayers: number): StampTier {
  if (rank === 1) return 'first';
  if (rank === 2) return 'second';
  if (rank === 3) return 'third';
  if (rank <= Math.ceil(totalPlayers * 0.3)) return 'top30';
  return null;
}

// Set of dates in the window where the user engaged with any daily mode.
// Used by the unified streak — a played-day signal that doesn't require
// the user to have submitted to a specific mode.
async function getUserPlayedDatesAcrossModes(
  db: Kysely<Database>,
  userId: string,
  windowStart: string,
  windowEnd: string,
): Promise<Set<string>> {
  const dates = new Set<string>();

  const [timed, zen, gauntlet] = await Promise.all([
    db
      .selectFrom('daily_results')
      .select('date')
      .where('user_id', '=', userId)
      .where('date', '>=', windowStart)
      .where('date', '<=', windowEnd)
      .where('ended_at', 'is not', null)
      .execute(),
    db
      .selectFrom('daily_zen_results')
      .select('date')
      .where('user_id', '=', userId)
      .where('date', '>=', windowStart)
      .where('date', '<=', windowEnd)
      .execute(),
    db
      .selectFrom('daily_gauntlet_results')
      .select('date')
      .where('user_id', '=', userId)
      .where('date', '>=', windowStart)
      .where('date', '<=', windowEnd)
      .execute(),
  ]);

  for (const row of timed) dates.add(row.date);
  for (const row of zen) dates.add(row.date);
  for (const row of gauntlet) dates.add(row.date);
  return dates;
}

export async function getDailyStats(
  db: Kysely<Database>,
  userId: string,
  config: DailyStatsConfig
): Promise<DailyStatsResponse> {
  const {
    launchDate,
    today,
    getPuzzleNumber,
    windowDays = 30,
    includeDefinitions = true,
  } = config;

  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  // Query 1: this user's rank + aggregates per date they played. In-progress
  // sessions (ended_at is null) are excluded — they don't belong on the
  // leaderboard and they have no final score to rank by yet. Ranked on points
  // alone so equal points share a place (1, 1, 3); this keeps the stamp tier
  // consistent with the leaderboard, where a tie is purely an equal score.
  const rankedRows = await db
    .with('ranked', (qb) =>
      qb
        .selectFrom('daily_results')
        .select((eb) => [
          'user_id',
          'date',
          'points',
          'word_count',
          'longest_word',
          'board_size',
          'min_word_length',
          'time_limit',
          sql<number>`rank() over (partition by ${eb.ref('date')} order by ${eb.ref('points')} desc)`.as('rank'),
        ])
        .where('date', '>=', windowStart)
        .where('date', '<=', windowEnd)
        .where('ended_at', 'is not', null)
    )
    .selectFrom('ranked')
    .select(['date', 'points', 'word_count', 'longest_word', 'board_size', 'min_word_length', 'time_limit', 'rank'])
    .where('user_id', '=', userId)
    .execute();

  // Query 2: total players per date in the window — needed for every day,
  // not just days this user played, so the UI can show player counts on
  // missed/unplayed days too. Excludes in-progress sessions for the same
  // reason as the rank query.
  const playerCountRows = await db
    .selectFrom('daily_results')
    .select((eb) => ['date', eb.fn.countAll<number>().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .where('ended_at', 'is not', null)
    .groupBy('date')
    .execute();

  const userByDate = new Map<string, typeof rankedRows[number]>();
  for (const row of rankedRows) userByDate.set(row.date, row);

  const playersByDate = new Map<string, number>();
  for (const row of playerCountRows) playersByDate.set(row.date, Number(row.players));

  const definitions = includeDefinitions
    ? await getDefinitions(Array.from(
      new Set(rankedRows.map((r) => r.longest_word).filter((w): w is string => !!w)),
    ))
    : new Map<string, WordDefinition | null>();

  const days: DailyStatsDay[] = [];
  for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
    const userRow = userByDate.get(d);
    const playersCount = playersByDate.get(d) ?? 0;

    if (!userRow) {
      // User didn't play this day. "Unplayed" only applies to today; past
      // dates without a row are misses.
      days.push({
        date: d,
        puzzleNumber: getPuzzleNumber(d),
        state: d === today ? 'unplayed' : 'missed',
        points: null,
        wordsFound: null,
        longestWord: null,
        longestWordDefinition: null,
        stampTier: null,
        playersCount,
        config: getDailyConfig(d),
      });
      continue;
    }

    const rank = Number(userRow.rank);
    days.push({
      date: d,
      puzzleNumber: getPuzzleNumber(d),
      state: 'completed',
      points: userRow.points,
      wordsFound: userRow.word_count,
      longestWord: userRow.longest_word,
      longestWordDefinition: definitions.get(userRow.longest_word.toLowerCase()) ?? null,
      stampTier: stampTierFor(rank, playersCount),
      playersCount,
      config: {
        boardSize: userRow.board_size,
        minWordLength: userRow.min_word_length,
        timeLimit: userRow.time_limit,
      },
    });
  }

  // Streak is unified across all daily modes: playing the timed daily,
  // the zen daily, or the gauntlet on a given date all count as a played
  // day. The per-day stats below stay timed-specific (points/longest/etc.
  // only make sense for the timed mode), but the streak signal reflects
  // every form of daily engagement so users aren't punished for choosing
  // a mode that doesn't have streak semantics of its own.
  //
  // Played dates are queried from launchDate (not windowStart) so the streak
  // can run longer than the 30-day history window. The history grid below
  // stays windowed; only the streak walk needs the full play history.
  const playedDates = await getUserPlayedDatesAcrossModes(
    db,
    userId,
    launchDate,
    windowEnd,
  );

  const currentStreak = computeStreak(playedDates, today, launchDate);

  // streakDays: last 7 PST days ending at today, oldest-to-newest.
  // Slicing the tail of `days` works because days is already in that order
  // and the window always ends at today. If the window is shorter than 7
  // (very early post-launch), pad the front with `false`.
  const tail = days.slice(-7);
  const streakDays: boolean[] = [
    ...Array(Math.max(0, 7 - tail.length)).fill(false),
    ...tail.map((d) => playedDates.has(d.date)),
  ];

  // 7-day avg: last 7 PLAYED days anywhere in window. Includes today if
  // played, so a user who just submitted sees it reflected immediately.
  const completed = days.filter((d) => d.state === 'completed');
  const recent = completed.slice(-7);
  const avgPoints = recent.length === 0
    ? 0
    : recent.reduce((s, d) => s + (d.points ?? 0), 0) / recent.length;
  const avgWords = recent.length === 0
    ? 0
    : recent.reduce((s, d) => s + (d.wordsFound ?? 0), 0) / recent.length;

  return {
    currentStreak,
    streakDays,
    avgPoints,
    avgWords,
    windowStart,
    windowEnd,
    days,
  };
}

// ─── Session lifecycle ────────────────────────────────────────────────────
//
// Timed daily mode runs as a server-authoritative session: the row is
// created on /start with started_at = now(), every word goes through
// path + dictionary validation against the official board, and the row
// is finalized either by the player or auto-finalized by the server when
// the time limit elapses. The previous one-shot POST /results endpoint
// accepted a client word list with no validation, which let an attacker
// inflate scores arbitrarily — that endpoint no longer exists.

export interface TimedDailySession {
  date: string;
  board: string[][];
  found_words: string[];
  word_times: (number | null)[];
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
}

// Grace window for late submissions. The client perceives the timer
// hitting zero from its local clock; the same submission reaching the
// server can be a few hundred ms behind that. A 2s buffer keeps the last
// fairly-played word from getting rejected on slow connections without
// meaningfully extending the play window.
export const TIMED_DAILY_GRACE_SECONDS = 2;

export type TimedSubmitOutcome =
  | { valid: true; word: string; score: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' };

function parseTimedSession(row: {
  date: string;
  board: unknown;
  found_words: unknown;
  word_times: unknown;
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
    word_times: parseWordTimes(row.word_times),
    started_at: row.started_at,
    ended_at: row.ended_at,
    points: row.points,
    word_count: row.word_count,
    longest_word: row.longest_word,
    time_limit: row.time_limit,
  };
}

function isExpired(
  session: { started_at: Date; time_limit: number },
  now: Date,
): boolean {
  return isTimedSessionExpired(
    session.started_at,
    session.time_limit,
    TIMED_DAILY_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(session: { started_at: Date; time_limit: number }): Date {
  return timedExpiryInstant(session.started_at, session.time_limit);
}

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  userId: string,
  date: string,
  session: TimedDailySession,
): Promise<TimedDailySession> {
  if (session.ended_at || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await db
    .updateTable('daily_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  return { ...session, ended_at: endedAt };
}

export async function getTimedDailySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimedDailySession | null> {
  const row = await db
    .selectFrom('daily_results')
    .select([
      'date',
      'board',
      'found_words',
      'word_times',
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
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, date, parseTimedSession(row));
}

// Idempotent. The board is locked in at creation time so resumes after a
// reload always see the same puzzle even if generation logic shifts.
export async function startTimedDailySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  board: string[][],
  config: DailyConfig,
): Promise<TimedDailySession> {
  await db
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

  const session = await getTimedDailySession(db, userId, date);
  if (!session) throw new Error('Failed to start timed daily session');
  return session;
}

// Trust-but-verify: validate path, derive the word from the stored board,
// dictionary-check it, dedupe, then atomically append. The time-limit
// check is also enforced here — past the deadline + grace, the row is
// auto-finalized and the submission is rejected as 'expired'.
export async function submitTimedDailyWord(
  db: Kysely<Database>,
  userId: string,
  date: string,
  path: Position[],
): Promise<TimedSubmitOutcome> {
  const session = await getTimedDailySession(db, userId, date);
  if (!session) return { valid: false, reason: 'invalid' };
  if (session.ended_at) return { valid: false, reason: 'ended' };

  const config = getDailyConfig(date);
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

  const wordTimes = appendWordTimes(
    session.word_times,
    session.found_words.length,
    result.nextWords.length - session.found_words.length,
    elapsedSeconds(session.started_at),
  );

  await db
    .updateTable('daily_results')
    .set({
      found_words: JSON.stringify(result.nextWords),
      word_times: JSON.stringify(wordTimes),
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();

  return { valid: true, word: result.word, score: result.score };
}

// Player-triggered finalize. Caps the recorded completion at
// started_at + time_limit so a slow /end call can't make the row look
// like the player took longer than allowed. completed_at is updated in
// lockstep with ended_at; ranking no longer uses it (ties are decided by
// score alone), but it stays an honest record of when the session ended.
export async function endTimedDailySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimedDailySession | null> {
  const session = await getTimedDailySession(db, userId, date);
  if (!session) return null;
  if (session.ended_at) return session;

  const now = new Date();
  const cap = expiryInstant(session);
  const endedAt = now > cap ? cap : now;

  await db
    .updateTable('daily_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('ended_at', 'is', null)
    .execute();
  return getTimedDailySession(db, userId, date);
}
