import crypto from 'crypto';
import type { Kysely } from 'kysely';
import { generateSalt, hashWord, type Position } from 'models';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { generateSeededBoard } from 'engine/board.js';
import { randomSeed } from 'models/seedCode';
import type { Database } from '../db/types.js';
import { dictionary } from './dictionary.js';
import { getDailyDatePST } from './dailyConfig.js';
import { scoreResult } from './DailyService.js';

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
  if (session.time_limit <= 0) return false;
  const elapsed = Math.floor((now.getTime() - session.started_at.getTime()) / 1000);
  return elapsed > session.time_limit + FREE_PLAY_GRACE_SECONDS;
}

function expiryInstant(session: { started_at: Date; time_limit: number }): Date {
  return new Date(session.started_at.getTime() + session.time_limit * 1000);
}

async function autoFinalizeIfExpired(
  db: Kysely<Database>,
  session: FreePlaySession,
): Promise<FreePlaySession> {
  if (session.completed_at || !isExpired(session, new Date())) return session;
  const completedAt = expiryInstant(session);
  await db
    .updateTable('free_play_sessions')
    .set({ completed_at: completedAt })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .execute();
  return { ...session, completed_at: completedAt };
}

export async function getActiveFreePlaySession(
  db: Kysely<Database>,
  userId: string,
): Promise<FreePlaySession | null> {
  const row = await db
    .selectFrom('free_play_sessions')
    .select([
      'id',
      'board',
      'found_words',
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
    ])
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .orderBy('started_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  if (!row) return null;
  const session = await autoFinalizeIfExpired(db, parseFreePlaySession(row));
  // A row that auto-finalized between the select and the update is no
  // longer "active" — surface as null so callers don't treat it as
  // resumable.
  return session.completed_at ? null : session;
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
export async function submitFreePlayWord(
  db: Kysely<Database>,
  userId: string,
  path: Position[],
): Promise<FreePlaySubmitOutcome> {
  const session = await getActiveFreePlaySession(db, userId);
  if (!session) return { valid: false, reason: 'ended' };

  if (!isValidPath(path, session.board_size)) {
    return { valid: false, reason: 'invalid' };
  }

  const word = path
    .map((pos) => session.board[pos.row][pos.col])
    .join('')
    .toUpperCase();

  if (word.length < session.min_word_length) {
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
    .updateTable('free_play_sessions')
    .set({
      found_words: JSON.stringify(nextWords),
      points,
      word_count: wordCount,
      longest_word: longestWord,
    })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .execute();

  return { valid: true, word, score: scoreWord(word) };
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
    .set({ completed_at: completedAt })
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
    .select([
      'id',
      'board',
      'found_words',
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
    ])
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
  foundWords: { word: string; path: Position[]; score: number }[];
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
    .map((w) => {
      const upper = w.toUpperCase();
      const path = pathByWord.get(upper);
      return path ? { word: upper, path, score: scoreWord(upper) } : null;
    })
    .filter((w): w is { word: string; path: Position[]; score: number } => w !== null);

  const missedWords = allWords
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }));

  foundWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);
  missedWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);

  return { board: session.board, foundWords, missedWords };
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
