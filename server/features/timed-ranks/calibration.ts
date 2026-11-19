import { getTimedRankStarts } from 'models/timedRanks';
import { createHash } from 'node:crypto';
import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import { attainablePoints, createDifficultyLookup, createTargets, MIN_CALIBRATION_BOARDS, MIN_CALIBRATION_GAMES, MODEL_VERSION, percentile, RANK_PERCENTILES } from './calculation.js';
import { settingsKey, type HistoricalGame, type PublishedRankModel, type RankCohort, type RankModel, type SolvedGame, type WordStats } from './types.js';

export function boardKey(board: string[][]): string {
  return createHash('sha256').update(JSON.stringify(board.map(row => row.map(letter => letter.toUpperCase())))).digest('hex');
}

export function solveHistory(games: HistoricalGame[], dictionary: Set<string>): SolvedGame[] {
  const solutions = new Map<string, string[]>();
  const scoredSolutions = new Map<string, { words: SolvedGame['words']; available: Set<string>; }>();
  return games.map(game => {
    const key = boardKey(game.board);
    const solutionKey = `${key}:${game.settings.minWordLength}`;
    let words = solutions.get(solutionKey);
    if (!words) {
      words = findAllWords(game.board, dictionary, game.settings.minWordLength).map(entry => entry.word.toUpperCase());
      solutions.set(solutionKey, words);
    }
    const modifier = game.modifier;
    const score = modifier ? (word: string) => scoreGauntletWord(word, modifier) : scoreWord;
    const scoringKey = JSON.stringify([solutionKey, modifier ?? null]);
    let scored = scoredSolutions.get(scoringKey);
    if (!scored) {
      scored = { words: words.map(word => ({ word, points: score(word) })), available: new Set(words) };
      scoredSolutions.set(scoringKey, scored);
    }
    const found = [...new Set(game.foundWords.map(word => word.toUpperCase()))].filter(word => scored.available.has(word));
    return {
      ...game,
      boardKey: key,
      foundWords: found,
      words: scored.words,
      points: found.reduce((sum, word) => sum + score(word), 0),
    };
  });
}

export function aggregateWords(games: SolvedGame[]): WordStats[] {
  const counts = new Map<string, WordStats & { boardKeys: Set<string>; }>();
  for (const game of games) {
    const found = new Set(game.foundWords);
    for (const { word } of game.words) {
      const row = counts.get(word) ?? { word, opportunities: 0, finds: 0, boards: 0, boardKeys: new Set<string>() };
      row.opportunities++;
      if (found.has(word)) row.finds++;
      row.boardKeys.add(game.boardKey);
      counts.set(word, row);
    }
  }
  return [...counts.values()].map(({ boardKeys, ...row }) => ({ ...row, boards: boardKeys.size })).sort((a, b) => a.word.localeCompare(b.word));
}

function groupBoards(games: SolvedGame[]): Map<string, SolvedGame[]> {
  const boards = new Map<string, SolvedGame[]>();
  for (const game of games) {
    const group = boards.get(game.boardKey) ?? [];
    group.push(game);
    boards.set(game.boardKey, group);
  }
  return boards;
}

interface BoardEstimate {
  game: SolvedGame;
  attainable: number;
  maximum: number;
}

function estimateHistoricalBoards(games: SolvedGame[], words: WordStats[], vocabulary: ReadonlyMap<string, number>): BoardEstimate[] {
  const estimates: BoardEstimate[] = [];
  // Exclude every occurrence of this layout, including older games outside the
  // calibration window. A popular board must not make itself appear easier.
  for (const boardGames of groupBoards(games).values()) {
    const available = new Set(boardGames[0].words.map(word => word.word));
    const finds = new Map<string, number>();
    for (const game of boardGames) {
      for (const word of game.foundWords) finds.set(word, (finds.get(word) ?? 0) + 1);
    }
    const withoutBoard = words.map(row => available.has(row.word) ? {
      ...row,
      opportunities: row.opportunities - boardGames.length,
      finds: row.finds - (finds.get(row.word) ?? 0),
      boards: row.boards - 1,
    } : row).filter(row => row.opportunities > 0);
    const difficulty = createDifficultyLookup(withoutBoard, vocabulary);
    const byScoring = new Map<string, { attainable: number; maximum: number }>();
    for (const game of boardGames) {
      const key = stableJson(game.modifier ?? null);
      let estimate = byScoring.get(key);
      if (!estimate) {
        estimate = {
          attainable: attainablePoints(game.words, difficulty),
          maximum: game.words.reduce((sum, word) => sum + word.points, 0),
        };
        byScoring.set(key, estimate);
      }
      estimates.push({ game, ...estimate });
    }
  }
  return estimates;
}

function calibrateMultipliers(
  games: SolvedGame[], estimates: BoardEstimate[], beforeDate: string,
): Pick<RankCohort, 'multipliers' | 'calibration'> {
  const recentSince = new Date(`${beforeDate}T00:00:00Z`);
  recentSince.setUTCDate(recentSince.getUTCDate() - 60);
  const fromDate = recentSince.toISOString().slice(0, 10);
  const recent = games.filter(game => game.date >= fromDate);
  const enoughHistory = (sample: SolvedGame[]) => sample.length >= MIN_CALIBRATION_GAMES && groupBoards(sample).size >= MIN_CALIBRATION_BOARDS;
  const useRecent = enoughHistory(recent);
  const sample = useRecent ? recent : games;
  if (!enoughHistory(sample)) return { multipliers: null, calibration: null };
  const sampleIds = new Set(sample.map(game => game.id));
  const ratios = estimates.filter(estimate => sampleIds.has(estimate.game.id) && estimate.attainable > 0)
    .map(estimate => estimate.game.points / estimate.attainable);
  if (ratios.length < MIN_CALIBRATION_GAMES) return { multipliers: null, calibration: null };
  return {
    multipliers: RANK_PERCENTILES.map(p => percentile(ratios, p)),
    calibration: {
      fromDate: sample.reduce((first, game) => game.date < first ? game.date : first, beforeDate),
      throughDate: sample.reduce((last, game) => game.date > last ? game.date : last, '1970-01-01'),
      games: ratios.length,
      boards: groupBoards(sample).size,
      windowDays: useRecent ? 60 : null,
    },
  };
}

export function trainModel(
  games: SolvedGame[],
  vocabulary: ReadonlyMap<string, number>,
  previous?: PublishedRankModel,
  beforeDate?: string,
): RankModel {
  const throughDate = games.reduce((latest, game) => game.date > latest ? game.date : latest, '1970-01-01');
  const nextDay = new Date(`${throughDate}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const calibrationDate = beforeDate ?? nextDay.toISOString().slice(0, 10);
  const grouped = new Map<string, SolvedGame[]>();
  for (const game of games) {
    const key = settingsKey(game.settings);
    const group = grouped.get(key) ?? [];
    group.push(game);
    grouped.set(key, group);
  }
  const cohorts: Record<string, RankCohort> = {};
  for (const [key, group] of grouped) {
    const words = aggregateWords(group);
    const estimates = estimateHistoricalBoards(group, words, vocabulary);
    const uniqueBoards = new Map<string, number>();
    for (const { game, attainable, maximum } of estimates) {
      if (maximum > 0) uniqueBoards.set(`${game.boardKey}:${stableJson(game.modifier ?? null)}`, Math.max(0, Math.min(1, 1 - attainable / maximum)));
    }
    const boardDifficulties = [...uniqueBoards.values()].sort((a, b) => a - b);
    const published = previous?.cohorts[key];
    const calibration = group[0].settings.mode === 'zen'
      ? { multipliers: null, calibration: null }
      : published?.multipliers
      ? { multipliers: published.multipliers, calibration: published.calibration }
      : calibrateMultipliers(group, estimates, calibrationDate);
    cohorts[key] = {
      settings: group[0].settings, words, games: group.length, boards: groupBoards(group).size,
      ...calibration, boardDifficulties,
    };
  }
  // PostgreSQL JSONB reorders metadata keys. Fingerprints must depend on values,
  // not the key order of a freshly calculated versus reloaded calibration.
  const serialized = stableJson(cohorts);
  const digest = createHash('sha256').update(MODEL_VERSION).update(serialized).update(throughDate).digest('hex').slice(0, 20);
  return { version: `${MODEL_VERSION}:${digest}`, throughDate, cohorts };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map(key => [key, record[key]]));
    }
    return entry;
  });
}

export function evaluateHistory(games: SolvedGame[], vocabulary: ReadonlyMap<string, number>) {
  // Zen's fixed maximum-score ladder is not a calibrated timed performance rank.
  games = games.filter(game => game.settings.mode !== 'zen');
  const dates = [...new Set(games.map(game => game.date))].sort();
  const split = dates[Math.max(1, Math.floor(dates.length * 0.8))];
  const training = split ? games.filter(game => game.date < split) : games;
  const holdout = split ? games.filter(game => game.date >= split) : [];
  const model = trainModel(training, vocabulary, undefined, split);
  const results: Record<string, { games: number; supported: number; achieved: number[]; }> = {};
  const lookups = new Map<string, ReturnType<typeof createDifficultyLookup>>();
  for (const game of holdout) {
    const key = settingsKey(game.settings);
    const result = results[key] ?? { games: 0, supported: 0, achieved: RANK_PERCENTILES.map(() => 0) };
    result.games++;
    const cohort = model.cohorts[key];
    if (cohort?.multipliers) {
      let difficulty = lookups.get(key);
      if (!difficulty) {
        difficulty = createDifficultyLookup(cohort.words, vocabulary);
        lookups.set(key, difficulty);
      }
      const targets = createTargets(attainablePoints(game.words, difficulty), game.words.reduce((sum, word) => sum + word.points, 0), cohort.multipliers[cohort.multipliers.length - 1], model.version, cohort.boardDifficulties);
      if (targets) {
        result.supported++;
        getTimedRankStarts(targets).forEach((points, index) => { if (game.points >= points) result.achieved[index]++; });
      }
    }
    results[key] = result;
  }
  return {
    statistics: 'frozen-at-split',
    splitDate: split ?? null,
    trainingGames: training.length,
    holdoutGames: holdout.length,
    cohorts: Object.fromEntries(Object.entries(results).map(([key, result]) => [key, {
      ...result,
      trainingGames: model.cohorts[key]?.games ?? 0,
      trainingBoards: model.cohorts[key]?.boards ?? 0,
      achievementRates: result.supported ? result.achieved.map(count => count / result.supported) : null,
    }])),
  };
}
