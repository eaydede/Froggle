import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import { dictionary } from '../../../gameplay/dictionary.js';
import type { Database } from '../../../platform/database/types.js';
import { getDailyDatePST } from '../../timed-daily/config.js';
import { getZenDailyWordPercents } from '../../word-popularity/service.js';
import { getDailyZenConfig } from '../config.js';
import { getSession } from '../service.js';
export async function getResult(db: Kysely<Database>, userId: string, date: string) {
  const session = await getSession(db, userId, date);
  if (!session || !session.ended_at) {

    return { result: null };
  }
  const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
  const allWords = findAllWords(
    session.board,
    dictionary,
    getDailyZenConfig(date).minWordLength,
  );
  // The session row stores only word strings (not the path the player
  // drew), so we look the path up from the solver. A board position can
  // produce a given word along multiple paths; the solver returns one
  // canonical path per word, which is good enough for results-page
  // highlighting.
  const pathByWord = new Map(allWords.map((w) => [w.word, w.path]));
  const foundWords = session.found_words.map((w) => {
    const upper = w.toUpperCase();
    return {
      word: upper,
      path: pathByWord.get(upper) ?? [],
      score: scoreWord(upper),
    };
  });
  const missedWords = allWords
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

  const findPercents = await getZenDailyWordPercents(
    db,
    session.date,
    getDailyDatePST(),
  );


  return {
    result: {
      date: session.date,
      found_words: foundWords,
      board: session.board,
      missed_words: missedWords,
      ended_at: session.ended_at,
      ended_by_player: session.ended_by_player,
      is_competitive: session.is_competitive,
      theoretical_max_score: session.theoretical_max_score,
      find_percents: findPercents,
    },
  };

}
