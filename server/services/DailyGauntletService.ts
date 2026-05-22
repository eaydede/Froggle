import { sql, type Kysely } from 'kysely';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import type { Position } from 'models';
import {
  GAUNTLET_ROUND_COUNT,
  type GauntletEntry,
  type GauntletModifier,
  type GauntletRoundConfig,
  type GauntletRoundKind,
  type GauntletRoundSummary,
  type GauntletState,
} from 'models/gauntlet';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import {
  getDailyGauntletNumber,
  prepareGauntletRound,
} from './dailyGauntletConfig.js';

// Same grace window as timed daily — a few hundred ms of client/server
// clock drift shouldn't reject the last fairly-played word.
export const TIMED_GAUNTLET_GRACE_SECONDS = 2;

export interface GauntletRoundSession {
  date: string;
  roundIndex: number;
  roundKind: GauntletRoundKind;
  board: string[][];
  modifier: GauntletModifier;
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
  foundWords: string[];
  points: number;
  wordCount: number;
  longestWord: string;
  startedAt: Date;
  endedAt: Date | null;
  completedAt: Date | null;
}

export type GauntletSubmitOutcome =
  | { valid: true; word: string; score: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' | 'not_started' | 'locked' };

// Per-round score-with-aggregates. Returns the data we persist alongside
// the row. Mirrors scoreResult in DailyService but uses the gauntlet
// scorer so the round's modifier shapes the point total.
export function scoreGauntletResult(
  words: string[],
  modifier: GauntletModifier,
): { points: number; wordCount: number; longestWord: string } {
  let longestWord = '';
  let points = 0;
  for (const word of words) {
    points += scoreGauntletWord(word, modifier);
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points, wordCount: words.length, longestWord };
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

function isExpired(
  session: { startedAt: Date; config: { timeLimit: number } },
  now: Date,
): boolean {
  const elapsed = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
  return elapsed > session.config.timeLimit + TIMED_GAUNTLET_GRACE_SECONDS;
}

function expiryInstant(
  session: { startedAt: Date; config: { timeLimit: number } },
): Date {
  return new Date(session.startedAt.getTime() + session.config.timeLimit * 1000);
}

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  userId: string,
  session: GauntletRoundSession,
): Promise<GauntletRoundSession> {
  if (session.endedAt || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await db
    .updateTable('daily_gauntlet_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', session.date)
    .where('round_index', '=', session.roundIndex)
    .where('ended_at', 'is', null)
    .execute();
  return { ...session, endedAt, completedAt: endedAt };
}

export async function getGauntletRoundSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  roundIndex: number,
): Promise<GauntletRoundSession | null> {
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
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, parseSessionRow(row));
}

// Returns all rounds the player has at least started for the date, indexed
// by round_index. Used both to check the sequential gate and to render
// the gauntlet hub.
async function getRoundsForUser(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<Map<number, GauntletRoundSession>> {
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
  const map = new Map<number, GauntletRoundSession>();
  for (const row of rows) {
    let session = parseSessionRow(row);
    session = await autoFinalizeIfExpired(db, userId, session);
    map.set(session.roundIndex, session);
  }
  return map;
}

// Sequential gate: round N can only start if rounds 0..N-1 are ended.
// Returns the index of the first round that is *not* eligible to start
// because the predecessor isn't done, or null if the requested round
// is fine to start.
function gateBlocked(
  rounds: Map<number, GauntletRoundSession>,
  roundIndex: number,
): boolean {
  for (let i = 0; i < roundIndex; i++) {
    const prior = rounds.get(i);
    if (!prior || !prior.endedAt) return true;
  }
  return false;
}

// Idempotent. Locks in the board + modifier captured at start time so a
// resumed page after reload sees the exact same round. Enforces the
// sequential gate — round N requires rounds 0..N-1 ended.
export async function startGauntletRound(
  db: Kysely<Database>,
  userId: string,
  date: string,
  roundIndex: number,
): Promise<GauntletRoundSession | { error: 'locked' | 'invalid_round' }> {
  if (roundIndex < 0 || roundIndex >= GAUNTLET_ROUND_COUNT) {
    return { error: 'invalid_round' };
  }
  const existingRounds = await getRoundsForUser(db, userId, date);

  const existing = existingRounds.get(roundIndex);
  if (existing) return existing; // idempotent

  if (gateBlocked(existingRounds, roundIndex)) {
    return { error: 'locked' };
  }

  const prepared = prepareGauntletRound(date, roundIndex);
  await db
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

  const session = await getGauntletRoundSession(db, userId, date, roundIndex);
  if (!session) throw new Error('Failed to start gauntlet round');
  return session;
}

export async function submitGauntletWord(
  db: Kysely<Database>,
  userId: string,
  date: string,
  roundIndex: number,
  path: Position[],
): Promise<GauntletSubmitOutcome> {
  const session = await getGauntletRoundSession(db, userId, date, roundIndex);
  if (!session) return { valid: false, reason: 'not_started' };
  if (session.endedAt) return { valid: false, reason: 'ended' };

  if (!isValidPath(path, session.config.boardSize)) {
    return { valid: false, reason: 'invalid' };
  }

  const word = path
    .map((pos) => session.board[pos.row][pos.col])
    .join('')
    .toUpperCase();

  if (word.length < session.config.minWordLength) {
    return { valid: false, reason: 'invalid' };
  }
  if (!isValidWord(dictionary, word.toLowerCase())) {
    return { valid: false, reason: 'invalid' };
  }
  if (session.foundWords.some((w) => w.toUpperCase() === word)) {
    return { valid: false, reason: 'repeat' };
  }

  const nextWords = [...session.foundWords, word];
  const { points, wordCount, longestWord } = scoreGauntletResult(nextWords, session.modifier);

  await db
    .updateTable('daily_gauntlet_results')
    .set({
      found_words: JSON.stringify(nextWords),
      points,
      word_count: wordCount,
      longest_word: longestWord,
    })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .where('ended_at', 'is', null)
    .execute();

  return {
    valid: true,
    word,
    score: scoreGauntletWord(word, session.modifier),
  };
}

export async function endGauntletRound(
  db: Kysely<Database>,
  userId: string,
  date: string,
  roundIndex: number,
): Promise<GauntletRoundSession | null> {
  const session = await getGauntletRoundSession(db, userId, date, roundIndex);
  if (!session) return null;
  if (session.endedAt) return session;

  const now = new Date();
  const cap = expiryInstant(session);
  const endedAt = now > cap ? cap : now;

  await db
    .updateTable('daily_gauntlet_results')
    .set({ ended_at: endedAt, completed_at: endedAt })
    .where('user_id', '=', userId)
    .where('date', '=', date)
    .where('round_index', '=', roundIndex)
    .where('ended_at', 'is', null)
    .execute();
  return getGauntletRoundSession(db, userId, date, roundIndex);
}

// ─── Ranking ──────────────────────────────────────────────────────────────

interface RankedRow {
  user_id: string;
  date: string;
  round_index: number;
  points: number;
  word_count: number;
  rank: number;
  completed_at: Date;
}

// Per-round ranks across all finalized rows on the date. Used to render
// per-round leaderboards and to feed the aggregate. Tiebreak mirrors
// timed daily: points desc, word_count desc, completed_at asc.
export async function getGauntletRoundRanks(
  db: Kysely<Database>,
  date: string,
): Promise<RankedRow[]> {
  const rows = await db
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
          sql<number>`rank() over (partition by ${eb.ref('round_index')} order by ${eb.ref('points')} desc, ${eb.ref('word_count')} desc, ${eb.ref('completed_at')} asc)`.as('rank'),
        ])
        .where('date', '=', date)
        .where('ended_at', 'is not', null),
    )
    .selectFrom('ranked')
    .select(['user_id', 'date', 'round_index', 'points', 'word_count', 'completed_at', 'rank'])
    .execute();
  return rows.map((r) => ({
    user_id: r.user_id,
    date: r.date,
    round_index: r.round_index,
    points: Number(r.points),
    word_count: Number(r.word_count),
    rank: Number(r.rank),
    completed_at: r.completed_at as Date,
  }));
}

export interface AggregateEntry {
  userId: string;
  roundRanks: number[];           // length 3
  rankSum: number;
  bestSingleRank: number;
  lastFinishedAt: Date;
  aggregateRank: number;          // global rank by rankSum
}

// Aggregate ranks across all 3 rounds. Only includes players who have
// finalized all three rounds. Tiebreak order:
//   primary:    rankSum asc (lower = better — the gauntlet "score")
//   secondary:  best single-round rank (rewards specialists when tied)
//   tertiary:   last-round completed_at asc (earliest finisher wins)
export async function getGauntletAggregate(
  db: Kysely<Database>,
  date: string,
): Promise<AggregateEntry[]> {
  const ranked = await getGauntletRoundRanks(db, date);

  // Bucket per user. A player needs exactly GAUNTLET_ROUND_COUNT entries.
  const byUser = new Map<string, RankedRow[]>();
  for (const r of ranked) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  const entries: AggregateEntry[] = [];
  for (const [userId, rows] of byUser) {
    if (rows.length < GAUNTLET_ROUND_COUNT) continue;
    rows.sort((a, b) => a.round_index - b.round_index);
    const roundRanks = rows.map((r) => r.rank);
    const rankSum = roundRanks.reduce((s, r) => s + r, 0);
    const bestSingleRank = Math.min(...roundRanks);
    const lastFinishedAt = rows.reduce(
      (latest, r) => (r.completed_at > latest ? r.completed_at : latest),
      rows[0].completed_at,
    );
    entries.push({
      userId,
      roundRanks,
      rankSum,
      bestSingleRank,
      lastFinishedAt,
      aggregateRank: 0,
    });
  }

  entries.sort((a, b) => {
    if (a.rankSum !== b.rankSum) return a.rankSum - b.rankSum;
    if (a.bestSingleRank !== b.bestSingleRank) return a.bestSingleRank - b.bestSingleRank;
    return a.lastFinishedAt.getTime() - b.lastFinishedAt.getTime();
  });

  // Dense-rank by (rankSum, bestSingleRank, lastFinishedAt) so tied
  // players share a rank. The trio is unique enough in practice that
  // pure ties are rare, but keeping dense-rank semantics avoids
  // surprising the player who is "tied for 3rd" with a 4th-place display.
  let lastKey = '';
  let lastRank = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = `${e.rankSum}|${e.bestSingleRank}|${e.lastFinishedAt.getTime()}`;
    if (key !== lastKey) {
      lastRank = i + 1;
      lastKey = key;
    }
    e.aggregateRank = lastRank;
  }

  return entries;
}

// ─── Status helper used by the hub + results pages ───────────────────────

function gauntletState(rounds: Map<number, GauntletRoundSession>): GauntletState {
  let endedCount = 0;
  for (let i = 0; i < GAUNTLET_ROUND_COUNT; i++) {
    if (rounds.get(i)?.endedAt) endedCount++;
  }
  if (endedCount === 0) {
    // A round started but not ended still counts as "partial" from the
    // user's perspective — they've engaged with the gauntlet today.
    for (let i = 0; i < GAUNTLET_ROUND_COUNT; i++) {
      if (rounds.get(i)) return 'partial';
    }
    return 'unplayed';
  }
  if (endedCount === GAUNTLET_ROUND_COUNT) return 'completed';
  return 'partial';
}

export interface GauntletStatus {
  entry: GauntletEntry;
  // Index of the round the player should play next, or null if all done.
  nextRoundIndex: number | null;
  // Per-round configs for rounds the player has not yet started — sent
  // so the confirm page can describe the upcoming round before /start
  // creates the row.
  upcomingConfigs: Record<number, GauntletRoundConfig>;
  // Round *kinds* for every round (including locked ones), so the hub
  // can show "Hot letter" / "Rare letters" as titles for not-yet-playable
  // rounds without revealing the specific modifier instance (e.g. which
  // letter is hot — that's the reveal-on-start moment).
  roundKinds: GauntletRoundKind[];
}

export async function getGauntletStatus(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<GauntletStatus> {
  const rounds = await getRoundsForUser(db, userId, date);
  const state = gauntletState(rounds);

  // Per-round rank lookups — only needed once all 3 rounds are ended,
  // but cheap to fetch for partial states too so the hub can show
  // provisional ranks on rounds the player has finalized.
  const ranks = await getGauntletRoundRanks(db, date);
  const userRankByRound = new Map<number, number>();
  const playersByRound = new Map<number, number>();
  for (const r of ranks) {
    if (r.user_id === userId) userRankByRound.set(r.round_index, r.rank);
    playersByRound.set(r.round_index, (playersByRound.get(r.round_index) ?? 0) + 1);
  }

  const summaries: Array<GauntletRoundSummary | null> = [];
  let nextRoundIndex: number | null = null;
  const upcomingConfigs: Record<number, GauntletRoundConfig> = {};

  for (let i = 0; i < GAUNTLET_ROUND_COUNT; i++) {
    const session = rounds.get(i);
    if (!session) {
      summaries.push(null);
      // Sequential gate: the first not-started round whose predecessor is
      // ended (or which has no predecessor) is the playable one.
      if (nextRoundIndex === null) {
        const priorEnded = i === 0 || rounds.get(i - 1)?.endedAt != null;
        if (priorEnded) {
          nextRoundIndex = i;
          upcomingConfigs[i] = prepareGauntletRound(date, i).config;
        }
      }
      continue;
    }
    if (!session.endedAt && nextRoundIndex === null) {
      // Already-started-but-not-ended round is the playable one — the
      // player resumes here instead of advancing.
      nextRoundIndex = i;
    }
    summaries.push({
      index: i,
      kind: session.roundKind,
      boardSize: session.config.boardSize,
      timeLimit: session.config.timeLimit,
      minWordLength: session.config.minWordLength,
      modifier: session.modifier,
      points: session.points,
      wordsFound: session.wordCount,
      longestWord: session.longestWord,
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      rank: userRankByRound.get(i) ?? null,
      playersCount: playersByRound.get(i) ?? 0,
    });
  }

  // Aggregate rank only meaningful once the player has finalized all 3.
  let aggregateRankSum: number | null = null;
  let aggregateRank: number | null = null;
  let totalPlayersCompleted = 0;
  if (state === 'completed') {
    const aggregate = await getGauntletAggregate(db, date);
    totalPlayersCompleted = aggregate.length;
    const mine = aggregate.find((a) => a.userId === userId);
    if (mine) {
      aggregateRankSum = mine.rankSum;
      aggregateRank = mine.aggregateRank;
    }
  }

  const roundKinds: GauntletRoundKind[] = [];
  for (let i = 0; i < GAUNTLET_ROUND_COUNT; i++) {
    // Round kinds are fixed by index; prepareGauntletRound returns the
    // config shape deterministically from the date+index. We only need
    // the kind here, so derive it without exposing the modifier instance
    // for locked rounds.
    roundKinds.push(prepareGauntletRound(date, i).config.kind);
  }

  return {
    entry: {
      date,
      puzzleNumber: getDailyGauntletNumber(date),
      state,
      rounds: summaries,
      aggregateRankSum,
      aggregateRank,
      totalPlayersCompleted,
    },
    nextRoundIndex,
    upcomingConfigs,
    roundKinds,
  };
}
