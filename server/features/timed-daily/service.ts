import { scoreWord } from 'engine/scoring.js';
import { validateSubmission } from 'engine/submission.js';
import { type Kysely } from 'kysely';
import type { Position } from 'models';
import { dictionary } from '../../gameplay/dictionary.js';
import { scoreResult } from '../../gameplay/scoring.js';
import { isTimedSessionExpired, timedExpiryInstant } from '../../gameplay/timing.js';
import type { Database } from '../../platform/database/types.js';
import { getDailyConfig, type DailyConfig } from './config.js';
import * as repository from './repository.js';
import type { TimedDailySession, TimedSubmitOutcome } from './types.js';

// Grace window for late submissions. The client perceives the timer
// hitting zero from its local clock; the same submission reaching the
// server can be a few hundred ms behind that. A 2s buffer keeps the last
// fairly-played word from getting rejected on slow connections without
// meaningfully extending the play window.
export const TIMED_DAILY_GRACE_SECONDS = 2;

function isExpired(
  session: { started_at: Date; time_limit: number; },
  now: Date,
): boolean {
  return isTimedSessionExpired(
    session.started_at,
    session.time_limit,
    TIMED_DAILY_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(session: { started_at: Date; time_limit: number; }): Date {
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
  await repository.finishSession(db, endedAt, userId, date);
  return { ...session, ended_at: endedAt };
}

export async function getTimedDailySession(
  db: Kysely<Database>,
  userId: string,
  date: string,
): Promise<TimedDailySession | null> {
  const row = await repository.findSession(db, userId, date);
  if (!row) return null;
  return autoFinalizeIfExpired(db, userId, date, row);
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
  await repository.insertSession(db, userId, date, board, config);

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
  return db.transaction().execute(async trx => {
    const stored = await repository.lockSession(trx, userId, date);
    const session = stored ? await autoFinalizeIfExpired(trx, userId, date, stored) : null;
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

    await repository.saveWords(trx, result, userId, date);

    return { valid: true, word: result.word, score: result.score };

  });
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

  await repository.finishSession(db, endedAt, userId, date);
  return getTimedDailySession(db, userId, date);
}
