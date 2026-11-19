import { createHash } from 'node:crypto';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import type { Kysely } from 'kysely';
import { dictionary } from '../../../gameplay/dictionary.js';
import type { Database } from '../../../platform/database/types.js';
import { assessBoardDifficulty } from '../../timed-ranks/service.js';
import { getDailyZenConfig } from '../config.js';
import * as repository from './repository.js';

/** Shared across players and retained independently of Zen's existing rank ceiling.
 * Historical games receive a difficulty assessment on their first results visit. */
export async function prepareZenBoardDifficulty(
  db: Kysely<Database>, board: string[][], date: string, solvedWords?: string[],
) {
  const config = getDailyZenConfig(date);
  const key = createHash('sha256').update(JSON.stringify([date, board, config])).digest('hex');
  const saved = await repository.findAssessment(db, key);
  if (saved) return saved;
  const solution = solvedWords ?? findAllWords(board, dictionary, config.minWordLength).map(({ word }) => word);
  const words = solution.map(word => ({ word, points: scoreWord(word) }));
  const assessment = await assessBoardDifficulty(db, words, {
    mode: 'zen', boardSize: board.length, minWordLength: config.minWordLength, timeLimit: 0,
  });
  return assessment ? repository.saveAssessment(db, key, assessment) : null;
}
