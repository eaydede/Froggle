import crypto from 'crypto';
import type { Kysely } from 'kysely';
import { generateSalt, hashWord, type InvalidSubmission, type Position } from 'models';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { generateSeededBoard } from 'engine/board.js';
import { validateSubmission } from 'engine/submission.js';
import { randomSeed } from 'models/seedCode';
import type { Database } from '../db/types.js';
import type { RoomBoardCompletion } from '../multiplayer/store.js';
import { dictionary } from './dictionary.js';
import { getDailyDatePST } from './dailyConfig.js';
import { scoreResult } from './DailyService.js';
import { isTimedSessionExpired, timedExpiryInstant } from './sessionTiming.js';
import { appendWordTimes, elapsedSeconds, parseWordTimes } from './wordTiming.js';
import { appendInvalidSubmission, parseInvalidSubmissions } from './invalidSubmissions.js';

// Counts challenge participants whose completions are unseen by the
// originator. A row counts as "unseen" when it isn't the originator's
// own row AND its completion landed after last_viewed_at — falling back
// to the originator's own completion time when the view has never been
// opened. Returned as a Map keyed by challenge_id for cheap O(1) lookups
// from the history endpoint.
export interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  completed_at: Date;
}

export interface ChallengeOwnerRow {
  id: string;
  completed_at: Date;
  last_viewed_at: Date | null;
}

export function computeChallengeNewResults(
  ownerRows: ChallengeOwnerRow[],
  participantRows: ChallengeParticipantRow[],
): Map<string, number> {
  const baseline = new Map<string, number>();
  for (const owner of ownerRows) {
    const cutoff = owner.last_viewed_at ?? owner.completed_at;
    baseline.set(owner.id, cutoff.getTime());
  }

  const counts = new Map<string, number>();
  for (const owner of ownerRows) counts.set(owner.id, 0);

  for (const p of participantRows) {
    const cutoffMs = baseline.get(p.challenge_id);
    if (cutoffMs === undefined) continue;
    if (p.id === p.challenge_id) continue; // skip owner's own row
    if (p.completed_at.getTime() > cutoffMs) {
      counts.set(p.challenge_id, (counts.get(p.challenge_id) ?? 0) + 1);
    }
  }

  return counts;
}

// ─── Session lifecycle ────────────────────────────────────────────────────
//
// Free-play runs as a server-authoritative session mirroring daily timed:
// the row is created on /start with started_at = now() and completed_at
// null, mutated on every word submission, finalized either by /end or by
// the auto-expiry check on read. The DB row is the source of truth so a
// browser refresh resumes the in-progress game from server state instead
// of restarting the local timer.

export interface FreePlaySession {
  id: string;
  board: string[][];
  found_words: string[];
  word_times: (number | null)[];
  invalid_submissions: InvalidSubmission[];
  started_at: Date;
  completed_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
  board_size: number;
  min_word_length: number;
  challenge_id: string | null;
  seed: number | null;
}

// Same grace window as the daily timed session. The client perceives the
// timer hitting zero from its local clock; the same submission reaching
// the server can be a few hundred ms behind that, and a 2s buffer keeps
// the last fairly-played word from getting rejected on slow connections.
export const FREE_PLAY_GRACE_SECONDS = 2;

export type FreePlaySubmitOutcome =
  | { valid: true; word: string; score: number }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' };

function parseFreePlaySession(row: {
  id: string;
  board: unknown;
  found_words: unknown;
  word_times: unknown;
  invalid_submissions: unknown;
  started_at: Date;
  completed_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
  board_size: number;
  min_word_length: number;
  challenge_id: string | null;
  seed: number | null;
}): FreePlaySession {
  const board = typeof row.board === 'string' ? JSON.parse(row.board) : (row.board as string[][]);
  const foundWords = typeof row.found_words === 'string'
    ? JSON.parse(row.found_words)
    : (row.found_words as string[]);
  return {
    id: row.id,
    board,
    found_words: foundWords,
    word_times: parseWordTimes(row.word_times),
    invalid_submissions: parseInvalidSubmissions(row.invalid_submissions),
    started_at: row.started_at,
    completed_at: row.completed_at,
    points: row.points,
    word_count: row.word_count,
    longest_word: row.longest_word,
    time_limit: row.time_limit,
    board_size: row.board_size,
    min_word_length: row.min_word_length,
    challenge_id: row.challenge_id,
    seed: row.seed,
  };
}

// time_limit = 0 means an unlimited (untimed) game — never auto-expires.
function isExpired(
  session: { started_at: Date; time_limit: number },
  now: Date,
): boolean {
  return isTimedSessionExpired(
    session.started_at,
    session.time_limit,
    FREE_PLAY_GRACE_SECONDS,
    now,
  );
}

function expiryInstant(session: { started_at: Date; time_limit: number }): Date {
  return timedExpiryInstant(session.started_at, session.time_limit);
}

const SESSION_COLUMNS = [
  'id',
  'board',
  'found_words',
  'word_times',
  'invalid_submissions',
  'started_at',
  'completed_at',
  'points',
  'word_count',
  'longest_word',
  'time_limit',
  'board_size',
  'min_word_length',
  'challenge_id',
  'seed',
] as const;

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  session: FreePlaySession,
): Promise<FreePlaySession> {
  if (session.completed_at || !isExpired(session, new Date())) return session;
  const completedAt = expiryInstant(session);
  await db
    .updateTable('free_play_sessions')
    .set({ completed_at: completedAt, date: getDailyDatePST(completedAt) })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .execute();
  return { ...session, completed_at: completedAt };
}

export async function getActiveFreePlaySession(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  const session = await readAndAutoFinalize(db, userId);
  // A row that auto-finalized between the select and the update is no
  // longer "active" — surface as null so callers don't treat it as
  // resumable.
  return session && !session.completed_at ? session : null;
}

// Like getActiveFreePlaySession, but preserves the session row after this
// read auto-finalizes it so callers (e.g. /api/game/state) can observe the
// Finished state and route the client to results. Returns null only when
// there is no open session at all.
export async function getFreePlaySessionForState(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  return readAndAutoFinalize(db, userId);
}

async function readAndAutoFinalize(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  const row = await db
    .selectFrom('free_play_sessions')
    .select(SESSION_COLUMNS)
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .orderBy('started_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  if (!row) return null;
  return autoFinalizeIfExpired(db, parseFreePlaySession(row));
}

export interface StartFreePlayOpts {
  userId: string;
  durationSeconds: number;
  boardSize: number;
  minWordLength: number;
  predefinedBoard?: string[][];
  seed?: number;
  challengeId: string | null;
}

export interface StartFreePlayResult {
  session: FreePlaySession;
  // Salted board solution for client-side instant validation. Same role
  // as the salt/wordHashes pair returned by the daily endpoints.
  salt: string;
  wordHashes: string[];
}

// Starts a fresh free-play session. Any pre-existing in-progress row for
// the same user is dropped first so the partial unique index on
// (user_id) where completed_at is null doesn't reject the insert — this
// matches the prior /create-then-/start UX where calling /start always
// began a new game.
export async function startFreePlaySession(
  db: Kysely<Database>,
  opts: StartFreePlayOpts,
): Promise<StartFreePlayResult> {
  const gameSeed = opts.seed ?? randomSeed();
  const board = opts.predefinedBoard && opts.predefinedBoard.length === opts.boardSize
    ? opts.predefinedBoard
    : generateSeededBoard(opts.boardSize, gameSeed);

  const id = crypto.randomUUID();

  await db
    .deleteFrom('free_play_sessions')
    .where('user_id', '=', opts.userId)
    .where('completed_at', 'is', null)
    .execute();

  await db
    .insertInto('free_play_sessions')
    .values({
      id,
      user_id: opts.userId,
      date: getDailyDatePST(),
      board: JSON.stringify(board),
      found_words: JSON.stringify([]),
      time_limit: opts.durationSeconds,
      board_size: opts.boardSize,
      min_word_length: opts.minWordLength,
      challenge_id: opts.challengeId,
      seed: gameSeed,
    })
    .execute();

  const session = await getActiveFreePlaySession(db, opts.userId);
  if (!session) throw new Error('Failed to start free-play session');

  const { salt, wordHashes } = solveFreePlayBoard(session.board, session.min_word_length);
  return { session, salt, wordHashes };
}

// Trust-but-verify per-word write. Path is bounds-checked, the word is
// derived from the stored board (so the client can't smuggle in
// off-board letters), dictionary-checked, deduped, and atomically
// appended. Auto-finalizes if the time window elapsed.
//
// Wraps the read/validate/write cycle in a transaction with SELECT FOR
// UPDATE on the session row. Concurrent submissions serialize on the
// row lock, so two valid words can no longer clobber each other and a
// duplicate of an in-flight word deterministically lands as `repeat`.
export async function submitFreePlayWord(
  db: Kysely<Database>,
  userId: string,
  path: Position[],
): Promise<FreePlaySubmitOutcome> {
  return db.transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom('free_play_sessions')
      .select(SESSION_COLUMNS)
      .where('user_id', '=', userId)
      .where('completed_at', 'is', null)
      .orderBy('started_at', 'desc')
      .limit(1)
      .forUpdate()
      .executeTakeFirst();
    if (!row) return { valid: false, reason: 'ended' };

    const session = parseFreePlaySession(row);

    if (isExpired(session, new Date())) {
      const completedAt = expiryInstant(session);
      await trx
        .updateTable('free_play_sessions')
        .set({ completed_at: completedAt, date: getDailyDatePST(completedAt) })
        .where('id', '=', session.id)
        .where('completed_at', 'is', null)
        .execute();
      return { valid: false, reason: 'expired' };
    }

    const result = validateSubmission(path, {
      board: session.board,
      foundWords: session.found_words,
      boardSize: session.board_size,
      minWordLength: session.min_word_length,
      dictionary,
      scoreWord,
      score: scoreResult,
    });
    if (!result.valid) {
      const attempts = appendInvalidSubmission(session.invalid_submissions, {
        word: result.word ?? '',
        reason: result.reason,
        t: elapsedSeconds(session.started_at),
        path,
      });
      await trx
        .updateTable('free_play_sessions')
        .set({ invalid_submissions: JSON.stringify(attempts) })
        .where('id', '=', session.id)
        .where('completed_at', 'is', null)
        .execute();
      return { valid: false, reason: result.reason };
    }

    const wordTimes = appendWordTimes(
      session.word_times,
      session.found_words.length,
      result.nextWords.length - session.found_words.length,
      elapsedSeconds(session.started_at),
    );

    const updated = await trx
      .updateTable('free_play_sessions')
      .set({
        found_words: JSON.stringify(result.nextWords),
        word_times: JSON.stringify(wordTimes),
        points: result.aggregate.points,
        word_count: result.aggregate.wordCount,
        longest_word: result.aggregate.longestWord,
      })
      .where('id', '=', session.id)
      .where('completed_at', 'is', null)
      .executeTakeFirst();

    // Defensive: if the row finalized between the locked select and the
    // update landing (e.g. /end ran in another connection that beat the
    // lock), the update affects zero rows. Don't claim the word was
    // accepted in that case.
    if (Number(updated.numUpdatedRows ?? 0) === 0) {
      return { valid: false, reason: 'ended' };
    }

    return { valid: true, word: result.word, score: result.score };
  });
}

// Player-triggered finalize. Caps completed_at at started_at + time_limit
// so a delayed /end call can't make the row look like the player took
// longer than allowed.
export async function endFreePlaySession(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  const session = await getActiveFreePlaySession(db, userId);
  if (!session) {
    // Either there's no row, or it already finalized between calls. Fall
    // back to the most-recently-completed row for the user so the client
    // still gets a session id to surface on the results page.
    return getMostRecentFreePlaySession(db, userId);
  }
  const now = new Date();
  const completedAt = session.time_limit > 0
    ? (now > expiryInstant(session) ? expiryInstant(session) : now)
    : now;
  await db
    .updateTable('free_play_sessions')
    .set({ completed_at: completedAt, date: getDailyDatePST(completedAt) })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .execute();
  return { ...session, completed_at: completedAt };
}

// Discards the in-progress row outright. Used by /api/game/cancel when
// the player abandons the configuration step or backs out of a running
// game — abandoned sessions shouldn't pollute history.
export async function cancelFreePlaySession(
  db: Kysely<Database>,
  userId: string,
): Promise<void> {
  await db
    .deleteFrom('free_play_sessions')
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .execute();
}

async function getMostRecentFreePlaySession(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  const row = await db
    .selectFrom('free_play_sessions')
    .select(SESSION_COLUMNS)
    .where('user_id', '=', userId)
    .where('completed_at', 'is not', null)
    .orderBy('completed_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  return row ? parseFreePlaySession(row) : null;
}

// Computes the results payload the /api/game/results endpoint returns:
// found + missed words with scores, sorted highest first. Pure function
// of the session row plus the dictionary.
export function buildFreePlayResults(session: FreePlaySession): {
  board: string[][];
  foundWords: { word: string; path: Position[]; score: number; timeSeconds: number | null }[];
  missedWords: { word: string; path: Position[]; score: number }[];
} {
  const allWords = findAllWords(session.board, dictionary, session.min_word_length);
  const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));

  // Found words: pair each persisted word with its canonical board path,
  // so the results page can replay them on the board. A word that's in
  // found_words but no longer reachable on the board (shouldn't happen,
  // since the board is locked at session start) is omitted from the
  // replay rather than fabricating a path.
  const pathByWord = new Map(allWords.map((w) => [w.word, w.path]));
  const foundWords = session.found_words
    .map((w, i) => {
      const upper = w.toUpperCase();
      const path = pathByWord.get(upper);
      return path
        ? { word: upper, path, score: scoreWord(upper), timeSeconds: session.word_times[i] ?? null }
        : null;
    })
    .filter(
      (w): w is { word: string; path: Position[]; score: number; timeSeconds: number | null } =>
        w !== null,
    );

  const missedWords = allWords
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }));

  foundWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);
  missedWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);

  return { board: session.board, foundWords, missedWords };
}

// ─── Multiplayer room → history bridge ────────────────────────────────────
//
// A finished room board persists one completed free_play_sessions row per
// authenticated participant, so room games (solo or multi) appear in /history
// and can be promoted to async challenges exactly like solo free-play. The
// row shape lines up 1:1 with the solo session: board, found words, points,
// config, and seed are all carried on the board.

/** Persist a finished multiplayer board as one completed session row per
 *  authenticated participant.
 *
 *  When two or more players played the board, every participant's row is
 *  stamped with one shared challenge_id so they're linked as a single game:
 *  the history endpoint then reports the real player count, ranks the field,
 *  and routes each player into the standings view where they see everyone who
 *  played — without this, each co-player only ever saw their own solo row.
 *  The challenge id is the host's own row id, reusing the same self-referential
 *  originator model as solo free-play: the host owns the board they set up, so
 *  sharing it attributes to them and "new results" badges land on their row
 *  when async recipients later play. If the host wasn't an authenticated
 *  participant we fall back to the first participant so an owner row always
 *  exists (the challenge endpoints key board/config and attribution off it).
 *
 *  A solo board keeps challenge_id null so it behaves exactly like a solo
 *  free-play session — promotable to a self-referential challenge on share. */
export async function persistRoomBoardResults(
  db: Kysely<Database>,
  completion: RoomBoardCompletion,
): Promise<void> {
  if (completion.participants.length === 0) return;
  const completedAt = new Date(completion.endedAt);
  const startedAt = new Date(completion.startedAt);
  const date = getDailyDatePST(completedAt);
  const boardJson = JSON.stringify(completion.board);

  // One signed-in account can hold two player slots (two devices / windows
  // with distinct reconnect keys). Collapse to a single row per user — their
  // best showing — so the shared challenge_id can't hit two rows for the same
  // user and trip the (user_id, challenge_id) unique index, which would reject
  // the whole batch and lose everyone's results.
  const byUser = new Map<string, RoomBoardCompletion['participants'][number]>();
  for (const p of completion.participants) {
    const prev = byUser.get(p.userId);
    if (
      !prev ||
      p.points > prev.points ||
      (p.points === prev.points && p.wordCount > prev.wordCount)
    ) {
      byUser.set(p.userId, p);
    }
  }
  const participants = [...byUser.values()];

  // Mint row ids up front so a multiplayer board can point every row's
  // challenge_id at the owner's row — making that row self-referential
  // (id === challenge_id), exactly like a shared solo session's originator.
  const rowIds = participants.map(() => crypto.randomUUID());
  let challengeId: string | null = null;
  if (participants.length > 1) {
    const hostIdx = completion.hostUserId
      ? participants.findIndex((p) => p.userId === completion.hostUserId)
      : -1;
    challengeId = rowIds[hostIdx >= 0 ? hostIdx : 0];
  }

  await db
    .insertInto('free_play_sessions')
    .values(
      participants.map((p, i) => ({
        id: rowIds[i],
        user_id: p.userId,
        date,
        board: boardJson,
        found_words: JSON.stringify(p.foundWords),
        word_times: JSON.stringify(p.foundWordTimes),
        invalid_submissions: JSON.stringify(p.invalidSubmissions),
        started_at: startedAt,
        completed_at: completedAt,
        points: p.points,
        word_count: p.wordCount,
        longest_word: p.longestWord,
        time_limit: completion.config.durationSeconds,
        board_size: completion.config.boardSize,
        min_word_length: completion.config.minWordLength,
        challenge_id: challengeId,
        seed: completion.seed,
      })),
    )
    .execute();
}

export interface RoomChallengeShare {
  challengeId: string;
  seed: number;
  config: { boardSize: number; timeLimit: number; minWordLength: number };
}

/** Promote the caller's persisted result for a specific room board into a
 *  shareable challenge, reusing the same self-referential challenge_id model
 *  as solo free-play (challenge id === originator session id). Idempotent:
 *  re-sharing the same board returns the existing challenge id. Returns null
 *  when the caller has no completed row for that board (an unauthenticated
 *  player, or before the board's history write has landed). */
export async function shareRoomBoardChallenge(
  db: Kysely<Database>,
  userId: string,
  board: { seed: number; boardSize: number },
): Promise<RoomChallengeShare | null> {
  const row = await db
    .selectFrom('free_play_sessions')
    .select(['id', 'challenge_id', 'board_size', 'time_limit', 'min_word_length', 'seed'])
    .where('user_id', '=', userId)
    .where('seed', '=', board.seed)
    .where('board_size', '=', board.boardSize)
    .where('completed_at', 'is not', null)
    .orderBy('completed_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  if (!row) return null;

  const challengeId = row.challenge_id ?? row.id;
  if (!row.challenge_id) {
    await db
      .updateTable('free_play_sessions')
      .set({ challenge_id: row.id })
      .where('id', '=', row.id)
      .execute();
  }

  return {
    challengeId,
    seed: row.seed ?? board.seed,
    config: {
      boardSize: row.board_size,
      timeLimit: row.time_limit,
      minWordLength: row.min_word_length,
    },
  };
}

// Per-fetch salted hash payload for client-side instant validation.
// Re-solves on every call — the call sites are /start and the per-mount
// active-session hydration, not every word submission, so the solver
// cost is amortized away.
export function solveFreePlayBoard(board: string[][], minWordLength: number): {
  salt: string;
  wordHashes: string[];
} {
  const all = findAllWords(board, dictionary, minWordLength);
  const salt = generateSalt();
  const wordHashes = all.map((w) => hashWord(w.word, salt));
  return { salt, wordHashes };
}
