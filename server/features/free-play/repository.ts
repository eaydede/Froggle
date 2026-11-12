import type { Kysely, Transaction } from 'kysely';
import type { WordProgress } from '../../gameplay/types.js';
import type { Database } from '../../platform/database/types.js';
import type { RoomBoardCompletion } from '../rooms/types.js';
import { getDailyDatePST } from '../timed-daily/config.js';
import type { FreePlaySession, StartFreePlayOpts } from './types.js';
const SESSION_COLUMNS = [
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
] as const;

export function finishSession(db: Kysely<Database>, completedAt: Date, session: FreePlaySession) {
  return db
    .updateTable('free_play_sessions')
    .set({ completed_at: completedAt, date: getDailyDatePST(completedAt) })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .execute();
}

export async function findActiveSession(db: Kysely<Database>, userId: string) {
  const row = await db
    .selectFrom('free_play_sessions')
    .select(SESSION_COLUMNS)
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .orderBy('started_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  return row ? parseFreePlaySession(row) : null;
}

export function insertSession(db: Kysely<Database>, id: string, opts: StartFreePlayOpts, board: string[][], gameSeed: number) {
  return db
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
}

export async function lockActiveSession(trx: Transaction<Database>, userId: string) {
  const row = await trx
    .selectFrom('free_play_sessions')
    .select(SESSION_COLUMNS)
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .orderBy('started_at', 'desc')
    .limit(1)
    .forUpdate()
    .executeTakeFirst();
  return row ? parseFreePlaySession(row) : null;
}

export function saveWords(trx: Transaction<Database>, result: WordProgress, session: FreePlaySession) {
  return trx
    .updateTable('free_play_sessions')
    .set({
      found_words: JSON.stringify(result.nextWords),
      points: result.aggregate.points,
      word_count: result.aggregate.wordCount,
      longest_word: result.aggregate.longestWord,
    })
    .where('id', '=', session.id)
    .where('completed_at', 'is', null)
    .executeTakeFirst();
}

export function discardOpenSessions(db: Kysely<Database>, userId: string) {
  return db
    .deleteFrom('free_play_sessions')
    .where('user_id', '=', userId)
    .where('completed_at', 'is', null)
    .execute();
}

export async function findLatestCompletedSession(db: Kysely<Database>, userId: string) {
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

export function insertRoomResults(db: Kysely<Database>, participants: { userId: string; foundWords: string[]; points: number; wordCount: number; longestWord: string; }[], rowIds: string[], date: string, boardJson: string, startedAt: Date, completedAt: Date, completion: RoomBoardCompletion, challengeId: string | null) {
  return db
    .insertInto('free_play_sessions')
    .values(
      participants.map((p, i) => ({
        id: rowIds[i],
        user_id: p.userId,
        date,
        board: boardJson,
        found_words: JSON.stringify(p.foundWords),
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

export function findRoomResult(db: Kysely<Database>, userId: string, board: { seed: number; boardSize: number; }) {
  return db
    .selectFrom('free_play_sessions')
    .select(['id', 'challenge_id', 'board_size', 'time_limit', 'min_word_length', 'seed'])
    .where('user_id', '=', userId)
    .where('seed', '=', board.seed)
    .where('board_size', '=', board.boardSize)
    .where('completed_at', 'is not', null)
    .orderBy('completed_at', 'desc')
    .limit(1)
    .executeTakeFirst();
}

export function markShared(db: Kysely<Database>, row: { id: string; time_limit: number; board_size: number; min_word_length: number; challenge_id: string | null; seed: number | null; }) {
  return db
    .updateTable('free_play_sessions')
    .set({ challenge_id: row.id })
    .where('id', '=', row.id)
    .execute();
}

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
