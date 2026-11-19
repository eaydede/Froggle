import type { BoardWordDifficultyAssessment } from 'models/results';
import { TIMED_RANK_POLICY_VERSION, type TimedRankTargets } from 'models/timedRanks';
import { createHash } from 'node:crypto';
import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import type { GauntletModifier } from 'models/gauntlet';
import { dictionary } from '../../gameplay/dictionary.js';
import type { Database } from '../../platform/database/types.js';
import { getDailyDatePST } from '../timed-daily/config.js';
import { attainablePoints, calculateBoardDifficulty, createDifficultyLookup, createTargets } from './calculation.js';
import { boardKey, evaluateHistory, solveHistory, trainModel } from './calibration.js';
import * as repository from './repository.js';
import { settingsKey, type HistoricalGame, type RankSettings } from './types.js';
import { getVocabulary } from './vocabulary.js';
import { PRODUCTION_PROJECT_REF } from './production.js';

export async function refreshRankStatistics(db: Kysely<Database> | null, options: {
  beforeDate: string; write: boolean; recalibrate?: boolean;
  history: HistoricalGame[]; sourceProjectRef: string;
}) {
  if (options.sourceProjectRef !== PRODUCTION_PROJECT_REF) throw new Error('Calibration requires production game history');
  if (options.write && !db) throw new Error('DATABASE_URL is required to publish the production model');
  const historical = options.history.filter(game => game.date < options.beforeDate);
  // Production contains an old 1×1/99-letter sentinel row, which is not a playable game.
  const eligible = historical.filter(game => [4, 5, 6].includes(game.settings.boardSize)
    && Number.isInteger(game.settings.minWordLength) && game.settings.minWordLength >= 3 && game.settings.minWordLength <= 6
    && Number.isFinite(game.settings.timeLimit)
    && (game.settings.mode === 'zen' ? game.settings.timeLimit === 0 : game.settings.timeLimit > 0));
  const solved = solveHistory(eligible, dictionary);
  const vocabulary = getVocabulary();
  const previous = options.recalibrate || !db ? null : await repository.latestModel(db, options.beforeDate);
  const model = trainModel(solved, vocabulary, previous ?? undefined, options.beforeDate);
  const report = {
    sourceProjectRef: options.sourceProjectRef,
    rankPolicyVersion: TIMED_RANK_POLICY_VERSION,
    excludedGames: { unsupportedSettings: historical.length - eligible.length, onOrAfterCutoff: options.history.length - historical.length },
    modelVersion: model.version,
    throughDate: model.throughDate,
    games: solved.length,
    cohorts: Object.fromEntries(Object.entries(model.cohorts).map(([key, cohort]) => [key, {
      games: cohort.games, boards: cohort.boards, words: cohort.words.length,
      multipliers: cohort.multipliers, supported: cohort.settings.mode === 'zen' || cohort.multipliers !== null,
      rankPolicy: cohort.settings.mode === 'zen' ? 'zen-percentages' : TIMED_RANK_POLICY_VERSION,
      calibration: cohort.calibration,
      comparisonBoards: cohort.boardDifficulties?.length ?? 0,
    }])),
    holdout: evaluateHistory(solved, vocabulary),
  };
  if (options.write && db && solved.length) await repository.publishModel(db, model, options.sourceProjectRef);
  return report;
}

/** Identity scopes shared daily puzzles; free play/challenges share by board + rules. */
export async function prepareRankTargets(
  db: Kysely<Database>,
  board: string[][],
  settings: RankSettings,
  identity: string,
  modifier?: GauntletModifier,
) {
  if (settings.mode === 'zen' || settings.timeLimit <= 0) return null;
  const key = createHash('sha256').update(JSON.stringify([identity, boardKey(board), settingsKey(settings), modifier ?? null])).digest('hex');
  const saved = await repository.findBoardTargets(db, key);
  if (saved) return saved.targets;
  const model = await repository.latestModel(db, getDailyDatePST());
  const cohort = model?.cohorts[settingsKey(settings)];
  if (!model || !cohort?.multipliers) return repository.saveBoardTargets(db, key, null);

  const stats = await repository.cohortWords(db, model.version, settingsKey(settings));
  const difficulty = createDifficultyLookup(stats, getVocabulary());
  const words = findAllWords(board, dictionary, settings.minWordLength).map(({ word }) => ({
    word, points: modifier ? scoreGauntletWord(word, modifier) : scoreWord(word),
  }));
  const attainable = attainablePoints(words, difficulty);
  const maximum = words.reduce((sum, word) => sum + word.points, 0);
  return repository.saveBoardTargets(db, key, createTargets(attainable, maximum, cohort.multipliers[cohort.multipliers.length - 1], model.version, cohort.boardDifficulties));
}

/** Use the saved statistics, rather than today's model, for completed-board details. */
export async function getWordDifficulties(
  db: Kysely<Database>, words: string[], settings: RankSettings, targets: Pick<TimedRankTargets, 'statisticsVersion'>,
): Promise<Record<string, number> | null> {
  const model = await repository.findModel(db, targets.statisticsVersion);
  const key = settingsKey(settings);
  if (!model?.cohorts[key]) return null;
  const stats = await repository.cohortWords(db, model.version, key);
  const difficulty = createDifficultyLookup(stats, getVocabulary());
  return Object.fromEntries(words.map(word => [word.toUpperCase(), difficulty(word.toUpperCase()).combined]));
}

/** Zen shares the word formula, but never uses timed rank multipliers. */
export async function assessBoardDifficulty(
  db: Kysely<Database>, words: Array<{ word: string; points: number }>, settings: RankSettings,
): Promise<BoardWordDifficultyAssessment | null> {
  const model = await repository.latestModel(db, getDailyDatePST());
  const cohort = model?.cohorts[settingsKey(settings)];
  if (!model || !cohort) return null;
  const stats = await repository.cohortWords(db, model.version, settingsKey(settings));
  const difficulty = createDifficultyLookup(stats, getVocabulary());
  return {
    statisticsVersion: model.version,
    boardDifficulty: calculateBoardDifficulty(
      attainablePoints(words, difficulty),
      words.reduce((sum, word) => sum + word.points, 0),
      cohort.boardDifficulties,
    ),
  };
}
