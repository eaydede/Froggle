import { scoreWord } from 'engine/scoring.js';
import type { Kysely } from 'kysely';
import type { Database } from '../../../platform/database/types.js';
import { getDailyDatePST } from '../../timed-daily/config.js';
import { getTimeIsMoneyDailyWordPercents } from '../../word-popularity/service.js';
import { getTimeIsMoneyNumber } from '../config.js';
import { cachedSolve } from '../puzzle.js';
import { getTimeIsMoneyRoster, getTimeIsMoneySession } from '../service.js';
export async function getResult(db: Kysely<Database>, userId: string, date: string) {
  const session = await getTimeIsMoneySession(db, userId, date);
  if (!session || !session.ended_at) {

    return { result: null };
  }

  const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
  const missedWords = cachedSolve(date, session.board, session.min_word_length)
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

  const roster = await getTimeIsMoneyRoster(db, date, userId);
  const findPercents = await getTimeIsMoneyDailyWordPercents(db, date, getDailyDatePST());


  return {
    result: {
      date,
      number: getTimeIsMoneyNumber(date),
      board: session.board,
      found_words: session.found_words,
      missed_words: missedWords,
      points: session.points,
      word_count: session.word_count,
      config: {
        boardSize: session.board_size,
        minWordLength: session.min_word_length,
        timeLimit: session.time_limit,
      },
      roster,
      find_percents: findPercents,
    },
  };

}
