import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import { dictionary } from '../../../gameplay/dictionary.js';
import { scoreWords } from '../../../gameplay/scoring.js';
import type { Database } from '../../../platform/database/types.js';
import { ApplicationError } from '../../../platform/errors.js';
import { getDisplayNames } from '../../profile/publicNames.js';
import { getTimedDailyWordPercents } from '../../word-popularity/service.js';
import { getDailyDatePST, getDailyNumber } from '../config.js';
import { getTimedDailySession } from '../service.js';
import * as repository from './repository.js';
export async function getResult(db: Kysely<Database>, userId: string, date: string) {
  // Auto-finalize on read so a player whose timer ran out without /end
  // being called still sees their result page.
  const session = await getTimedDailySession(db, userId, date);
  if (!session || !session.ended_at) {

    return { result: null };
  }
  const result = await repository.findResult(db, userId, date);

  if (!result) {

    return { result: null };
  }

  // Compute missed words on demand. The found_words column is canonical;
  // we re-solve the board each time rather than storing the full solution
  // so old results automatically pick up any future dictionary or
  // scoring changes. The board + ~170k-word dictionary runs in a
  // couple of ms so the compute cost is negligible at this endpoint's
  // volume.
  const board: string[][] = typeof result.board === 'string'
    ? JSON.parse(result.board)
    : result.board;
  const foundWords: string[] = typeof result.found_words === 'string'
    ? JSON.parse(result.found_words)
    : result.found_words;
  const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
  const config = {
    boardSize: result.board_size,
    minWordLength: result.min_word_length,
    timeLimit: result.time_limit,
  };
  const missedWords = findAllWords(board, dictionary, config.minWordLength)
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

  const findPercents = await getTimedDailyWordPercents(
    db,
    result.date,
    getDailyDatePST(),
  );


  return {
    result: {
      date: result.date,
      found_words: foundWords,
      board,
      missed_words: missedWords,
      completed_at: result.completed_at,
      config,
      find_percents: findPercents,
    },
  };

}

export async function comparePlayers(db: Kysely<Database>, userId: string, date: string, otherUserId: string) {
  const rows = await repository.findComparisonSessions(db, date, userId, otherUserId);

  const mine = rows.find((r) => r.user_id === userId);
  const theirs = rows.find((r) => r.user_id === otherUserId);

  if (!mine || !mine.ended_at) {
    throw new ApplicationError('conflict', 'You have not played this daily yet');
  }
  if (!theirs || !theirs.ended_at) {
    throw new ApplicationError('not-found', 'Opponent has not played this daily');
  }

  const displayNames = await getDisplayNames([userId, otherUserId]);
  const meMeta = displayNames.get(userId) ?? 'Anonymous';
  const themMeta = displayNames.get(otherUserId) ?? 'Anonymous';

  const parse = (r: typeof rows[number]) => {
    const board: string[][] = typeof r.board === 'string' ? JSON.parse(r.board) : r.board;
    const words: string[] = typeof r.found_words === 'string'
      ? JSON.parse(r.found_words)
      : r.found_words;
    return { board, words };
  };

  const me = parse(mine);
  const them = parse(theirs);

  const board = me.board;

  const mePayload = {
    userId: userId,
    displayName: meMeta,
    points: scoreWords(me.words),
    wordCount: me.words.length,
    foundWords: me.words.map((word) => ({ word, score: scoreWord(word) })),
  };
  const themPayload = {
    userId: otherUserId,
    displayName: themMeta,
    points: scoreWords(them.words),
    wordCount: them.words.length,
    foundWords: them.words.map((word) => ({ word, score: scoreWord(word) })),
  };

  const config = {
    boardSize: mine.board_size,
    minWordLength: mine.min_word_length,
    timeLimit: mine.time_limit,
  };


  return {
    date,
    puzzleNumber: getDailyNumber(date),
    board,
    me: mePayload,
    them: themPayload,
    config,
  };

}

export async function getHistory(db: Kysely<Database>, userId: string) {
  const results = await repository.listUserResults(db, userId);

  const today = getDailyDatePST();

  const entries = results.map((result) => {
    const words: string[] = typeof result.found_words === 'string'
      ? JSON.parse(result.found_words)
      : result.found_words;

    return {
      date: result.date,
      puzzleNumber: getDailyNumber(result.date),
      points: scoreWords(words),
      wordsFound: words.length,
      isToday: result.date === today,
    };
  });


  return { entries };

}
