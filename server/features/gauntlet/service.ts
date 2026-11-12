import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import { validateSubmission } from 'engine/submission.js';
import { type Kysely } from 'kysely';
import type { Position } from 'models';
import {
  GAUNTLET_ROUND_COUNT,
  type GauntletModifier,
  type GauntletRoundConfig,
  type GauntletRoundKind,
  type GauntletRoundSummary,
  type GauntletState,
  type GauntletStatsDay,
  type GauntletStatsResponse
} from 'models/gauntlet';
import { assignCompetitionRanks } from 'models/ranking';
import { dictionary } from '../../gameplay/dictionary.js';
import { isTimedSessionExpired, timedExpiryInstant } from '../../gameplay/timing.js';
import type { Database } from '../../platform/database/types.js';
import { getDailyGauntletNumber, prepareGauntletRound } from './config.js';
import * as repository from './repository.js';
import type { AggregateEntry, GauntletRoundSession, GauntletStatus, GauntletSubmitOutcome, RankedRow } from './types.js';

// Same grace window as timed daily — a few hundred ms of client/server
// clock drift shouldn't reject the last fairly-played word.
export const TIMED_GAUNTLET_GRACE_SECONDS = 2;

// Per-round score-with-aggregates. Returns the data we persist alongside
// the row. Mirrors scoreResult in DailyService but uses the gauntlet
// scorer so the round's modifier shapes the point total.
export function scoreGauntletResult(
  words: string[],
  modifier: GauntletModifier,
): { points: number; wordCount: number; longestWord: string; } {
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

// Pairs each word with its per-word score under the round's modifier.
// Route handlers use this for results / compare payloads so the modifier
// is applied through the service rather than reimplemented inline at the
// edge — keeps a single seam if the scoring rules ever change.
export function scoreFoundWords(
  words: string[],
  modifier: GauntletModifier,
): Array<{ word: string; score: number; }> {
  return words.map((word) => ({ word, score: scoreGauntletWord(word, modifier) }));
}

function isExpired(
  session: { startedAt: Date; config: { timeLimit: number; }; },
  now: Date,
): boolean {
  return isTimedSessionExpired(
    session.startedAt,
    session.config.timeLimit,
    TIMED_GAUNTLET_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(
  session: { startedAt: Date; config: { timeLimit: number; }; },
): Date {
  return timedExpiryInstant(session.startedAt, session.config.timeLimit);
}

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  userId: string,
  session: GauntletRoundSession,
): Promise<GauntletRoundSession> {
  if (session.endedAt || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await repository.finishSession(db, endedAt, userId, session.date, session.roundIndex);
  return { ...session, endedAt, completedAt: endedAt };
}

export async function getGauntletRoundSession(
  db: Kysely<Database>,
  userId: string,
  date: string,
  roundIndex: number,
): Promise<GauntletRoundSession | null> {
  const row = await repository.findSession(db, userId, date, roundIndex);
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, row);
}

// Returns all rounds the player has at least started for the date, indexed
// by round_index. Used both to check the sequential gate and to render
// the gauntlet hub.
async function getRoundsForUser(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<Map<number, GauntletRoundSession>> {
  const rows = await repository.listUserRounds(db, userId, date);
  const map = new Map<number, GauntletRoundSession>();
  for (const row of rows) {
    let session = row;
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
): Promise<GauntletRoundSession | { error: 'locked' | 'invalid_round'; }> {
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
  await repository.insertSession(db, userId, date, roundIndex, prepared);

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
  return db.transaction().execute(async trx => {
    const stored = await repository.lockSession(trx, userId, date, roundIndex);
    const session = stored ? await autoFinalizeIfExpired(trx, userId, stored) : null;
    if (!session) return { valid: false, reason: 'not_started' };
    if (session.endedAt) return { valid: false, reason: 'ended' };

    const result = validateSubmission(path, {
      board: session.board,
      foundWords: session.foundWords,
      boardSize: session.config.boardSize,
      minWordLength: session.config.minWordLength,
      dictionary,
      scoreWord: (w) => scoreGauntletWord(w, session.modifier),
      score: (words) => scoreGauntletResult(words, session.modifier),
    });
    if (!result.valid) return { valid: false, reason: result.reason };

    await repository.saveWords(trx, result, userId, date, roundIndex);

    return { valid: true, word: result.word, score: result.score };

  });
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

  await repository.finishSession(db, endedAt, userId, date, roundIndex);
  return getGauntletRoundSession(db, userId, date, roundIndex);
}

// Per-round ranks across all finalized rows on the date. Used to render
// per-round leaderboards and to feed the aggregate. Ranked on points
// alone so equal points share a place (1, 1, 3), matching timed daily
// and the canonical competition-rank rule in ranking.ts: a tie is an
// equal score, full stop — never broken by word count or finish time.
// The aggregate applies its own tiebreaks for final standings.
export async function getGauntletRoundRanks(
  db: Kysely<Database>,
  date: string,
): Promise<RankedRow[]> {
  const rows = await repository.listRoundRanks(db, date);
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

// Pure aggregation step. Splits out from getGauntletAggregate so the
// rank-sum / tiebreak / dense-rank logic can be unit-tested without a
// database. Only includes players with exactly `roundCount` rows. The
// caller is expected to pass GAUNTLET_ROUND_COUNT in production.
export function aggregateFromRoundRanks(
  ranked: RankedRow[],
  roundCount: number,
): AggregateEntry[] {
  const byUser = new Map<string, RankedRow[]>();
  for (const r of ranked) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  const entries: AggregateEntry[] = [];
  for (const [userId, rows] of byUser) {
    if (rows.length < roundCount) continue;
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

  // best single-round rank, then earliest last-finish, order the displayed
  // list among players who share a rank-sum — but they do NOT split the rank.
  entries.sort((a, b) => {
    if (a.rankSum !== b.rankSum) return a.rankSum - b.rankSum;
    if (a.bestSingleRank !== b.bestSingleRank) return a.bestSingleRank - b.bestSingleRank;
    return a.lastFinishedAt.getTime() - b.lastFinishedAt.getTime();
  });

  // Rank on rank-sum alone via the shared competition-rank helper: players with
  // an equal rank-sum share a place (1, 1, 3), the same tie rule the per-round
  // ranks and every other leaderboard use. The sort keys above only fix the
  // display order within a tie; they no longer break the rank.
  for (const { item, rank } of assignCompetitionRanks(entries, (e) => e.rankSum)) {
    item.aggregateRank = rank;
  }

  return entries;
}

// Aggregate ranks across all 3 rounds. Only includes players who have
// finalized all three rounds. Placement is by rankSum asc (lower = better —
// the gauntlet "score"); players with an equal rankSum share a rank. Best
// single-round rank, then earliest last-finish, only order the display within
// a tie — they do not split the rank.
export async function getGauntletAggregate(
  db: Kysely<Database>,
  date: string,
): Promise<AggregateEntry[]> {
  const ranked = await getGauntletRoundRanks(db, date);
  return aggregateFromRoundRanks(ranked, GAUNTLET_ROUND_COUNT);
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

// ─── History for the standings date picker ───────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

// Per-day gauntlet history over a lookback window. Mirrors getDailyZenStats
// in shape so the client can reuse the timeline picker, but folds the three
// per-round rows into a single per-day summary. Aggregate rank + rank-sum
// are resolved only for days the player finished all three rounds.
export async function getDailyGauntletStats(
  db: Kysely<Database>,
  userId: string,
  config: { launchDate: string; today: string; windowDays?: number; },
): Promise<GauntletStatsResponse> {
  const { launchDate, today, windowDays = 30 } = config;
  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  const userRows = await repository.listUserHistory(db, userId, windowStart, windowEnd);

  // Distinct players who engaged with the gauntlet on each day.
  const playerCountRows = await repository.countPlayers(db, windowStart, windowEnd);
  const playersByDate = new Map<string, number>();
  for (const row of playerCountRows) playersByDate.set(row.date, Number(row.players));

  interface DayAccum {
    endedRounds: number;
    points: number;
    words: number;
  }
  const byDate = new Map<string, DayAccum>();
  for (const r of userRows) {
    const acc = byDate.get(r.date) ?? { endedRounds: 0, points: 0, words: 0 };
    if (r.ended_at) acc.endedRounds += 1;
    acc.points += Number(r.points);
    acc.words += Number(r.word_count);
    byDate.set(r.date, acc);
  }

  // Aggregate standing only matters for days the player finished all three
  // rounds — compute the rank for those days and pull the player out of it.
  const completedDates = [...byDate.entries()]
    .filter(([, acc]) => acc.endedRounds >= GAUNTLET_ROUND_COUNT)
    .map(([date]) => date);
  const aggregateByDate = new Map<
    string,
    { rank: number | null; rankSum: number | null; total: number; }
  >();
  for (const date of completedDates) {
    const aggregate = await getGauntletAggregate(db, date);
    const mine = aggregate.find((a) => a.userId === userId);
    aggregateByDate.set(date, {
      rank: mine?.aggregateRank ?? null,
      rankSum: mine?.rankSum ?? null,
      total: aggregate.length,
    });
  }

  const days: GauntletStatsDay[] = [];
  for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
    const acc = byDate.get(d);
    const completed = !!acc && acc.endedRounds >= GAUNTLET_ROUND_COUNT;
    const state: GauntletState = completed ? 'completed' : acc ? 'partial' : 'unplayed';
    const agg = aggregateByDate.get(d);
    days.push({
      date: d,
      puzzleNumber: getDailyGauntletNumber(d),
      state,
      roundsCompleted: acc?.endedRounds ?? 0,
      points: completed ? acc!.points : null,
      wordsFound: completed ? acc!.words : null,
      aggregateRank: completed ? (agg?.rank ?? null) : null,
      aggregateRankSum: completed ? (agg?.rankSum ?? null) : null,
      totalPlayersCompleted: agg?.total ?? 0,
      playersCount: playersByDate.get(d) ?? 0,
    });
  }

  return { windowStart, windowEnd, days };
}
