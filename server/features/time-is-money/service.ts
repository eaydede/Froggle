import { scoreWord } from 'engine/scoring.js';
import { validateSubmission } from 'engine/submission.js';
import { type Kysely } from 'kysely';
import type { Position } from 'models';
import { assignCompetitionRanks } from 'models/ranking';
import { TIME_IS_MONEY_CONFIG, TIME_IS_MONEY_SECONDS_PER_POINT } from 'models/timeIsMoney';
import { dictionary } from '../../gameplay/dictionary.js';
import { scoreResult, scoreWords } from '../../gameplay/scoring.js';
import { isTimedSessionExpired, timedExpiryInstant } from '../../gameplay/timing.js';
import type { Database } from '../../platform/database/types.js';
import { getDisplayNames } from '../profile/publicNames.js';
import { prepareTimeIsMoneyBoard } from './config.js';
import * as repository from './repository.js';
import type { TimeIsMoneyCompareError, TimeIsMoneyComparePlayer, TimeIsMoneyCompareResult, TimeIsMoneyRosterEntry, TimeIsMoneySession, TimeIsMoneyStatus, TimeIsMoneySubmitOutcome } from './types.js';

// Same buzzer-grace window the timed daily uses — a word fairly played as the
// clock hits zero can reach the server a few hundred ms late.
export const TIME_IS_MONEY_GRACE_SECONDS = 2;

// ─── Session lifecycle ──────────────────────────────────────────────────────

// The mode's one twist: the countdown grows as points bank, so the deadline is
// a function of the score rather than a fixed length.
function effectiveTimeLimit(session: { time_limit: number; points: number; }): number {
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

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  userId: string,
  session: TimeIsMoneySession,
): Promise<TimeIsMoneySession> {
  if (session.ended_at || !isExpired(session, new Date())) return session;
  const endedAt = expiryInstant(session);
  await repository.finishSession(db, endedAt, userId, session.date);
  return { ...session, ended_at: endedAt };
}

export async function getTimeIsMoneySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneySession | null> {
  const row = await repository.findSession(db, userId, date);
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, row);
}

// Idempotent. Board is locked in at creation so resumes see the same puzzle.
export async function startTimeIsMoneySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimeIsMoneySession> {
  await repository.insertSession(db, userId, date, prepareTimeIsMoneyBoard(date), TIME_IS_MONEY_CONFIG);

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
  return db.transaction().execute(async trx => {
    const stored = await repository.lockSession(trx, userId, date);
    const session = stored ? await autoFinalizeIfExpired(trx, userId, stored) : null;
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

    await repository.saveWords(trx, result, userId, date);

    return {
      valid: true,
      word: result.word,
      score: result.score,
      points: result.aggregate.points,
    };

  });
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

  await repository.finishSession(db, endedAt, userId, date);
  return getTimeIsMoneySession(db, userId, date);
}

export async function getTimeIsMoneyRoster(
  db: Kysely<Database>,
  date: string,
  meUserId: string,
): Promise<TimeIsMoneyRosterEntry[]> {
  const rows = await repository.listDateSessions(db, date);
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

export async function getTimeIsMoneyCompare(
  db: Kysely<Database>,
  date: string,
  meUserId: string,
  otherUserId: string,
): Promise<
  { ok: true; data: TimeIsMoneyCompareResult; } | { ok: false; error: TimeIsMoneyCompareError; }
> {
  if (otherUserId === meUserId) return { ok: false, error: 'forbidden' };

  const rows = await repository.findComparisonSessions(db, date, meUserId, otherUserId);

  const mine = rows.find((r) => r.user_id === meUserId);
  const theirs = rows.find((r) => r.user_id === otherUserId);

  if (!mine || mine.ended_at === null) return { ok: false, error: 'unplayed' };
  if (!theirs || theirs.ended_at === null) return { ok: false, error: 'opponent-missing' };

  const displayNames = await getDisplayNames([meUserId, otherUserId]);
  const meName = displayNames.get(meUserId) ?? 'Anonymous';
  const themName = displayNames.get(otherUserId) ?? 'Anonymous';

  const parse = (r: typeof rows[number]) => ({
    board: repository.parseJson<string[][]>(r.board, []),
    words: repository.parseJson<string[]>(r.found_words, []),
  });

  const me = parse(mine);
  const them = parse(theirs);

  const player = (userId: string, displayName: string, words: string[]): TimeIsMoneyComparePlayer => ({
    userId,
    displayName,
    points: scoreWords(words),
    wordCount: words.length,
    foundWords: words.map((word) => ({ word, score: scoreWord(word) })),
  });

  return {
    ok: true,
    data: {
      date,
      // Both players solve the same seeded board; either copy is fine.
      board: me.board,
      me: player(meUserId, meName, me.words),
      them: player(otherUserId, themName, them.words),
    },
  };
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

  const ranked = await repository.findRank(db, date, userId);

  return {
    state: 'completed',
    points: session.points,
    wordCount: session.word_count,
    rank: ranked ? Number(ranked.rank) : null,
    timeLimit: session.time_limit,
  };
}
