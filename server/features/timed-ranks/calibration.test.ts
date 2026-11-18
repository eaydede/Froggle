import { describe, expect, it } from 'vitest';
import { evaluateHistory, solveHistory, trainModel } from './calibration.js';
import { settingsKey, type HistoricalGame, type SolvedGame } from './types.js';

const settings = { mode: 'timed', boardSize: 4, timeLimit: 120, minWordLength: 3 } as const;
const vocabulary = new Map([['CATS', 4], ['DOGS', 4], ['RATS', 4]]);

function game(index: number): SolvedGame {
  const words = ['CATS', 'DOGS', 'RATS'].map(word => ({ word, points: 2 }));
  const foundWords = words.slice(0, index % 4).map(entry => entry.word);
  return {
    id: `${index}`, date: `2026-01-${String(1 + Math.floor(index / 20)).padStart(2, '0')}`,
    board: [['A']], boardKey: `board-${index % 10}`, settings,
    words, foundWords, points: foundWords.length * 2,
  };
}

describe('historical calibration', () => {
  it('counts legal availability, including unfound words, once per game and board', () => {
    const history: HistoricalGame = { id: 'one', date: '2026-01-01', settings, board: [['C', 'A'], ['T', 'S']], foundWords: ['CAT', 'cat', 'CHEAT'] };
    const solved = solveHistory([history, { ...history, id: 'two', foundWords: [] }], new Set(['cat', 'cats', 'sat', 'at']));
    expect(solved[0].foundWords).toEqual(['CAT']);
    const cohort = trainModel(solved, vocabulary).cohorts[settingsKey(settings)];
    expect(cohort.words.find(word => word.word === 'CAT')).toMatchObject({ opportunities: 2, finds: 1, boards: 1 });
    expect(cohort.words.find(word => word.word === 'CATS')).toMatchObject({ opportunities: 2, finds: 0, boards: 1 });
    expect(cohort.words.some(word => word.word === 'AT')).toBe(false);
    expect(solved[0].words).toBe(solved[1].words);
  });

  it('keeps game settings separate and refuses unsupported calibration', () => {
    const games = Array.from({ length: 60 }, (_, index) => game(index));
    games.push({ ...game(100), settings: { ...settings, timeLimit: 180 } });
    const model = trainModel(games, vocabulary);
    expect(model.cohorts[settingsKey(settings)].multipliers).toHaveLength(5);
    expect(model.cohorts[settingsKey({ ...settings, timeLimit: 180 })].multipliers).toBeNull();
    expect(trainModel(games.map(entry => ({ ...entry, boardKey: 'same-board' })), vocabulary).cohorts[settingsKey(settings)].multipliers).toBeNull();
  });

  it('keeps published multipliers while refreshing word evidence', () => {
    const games = Array.from({ length: 60 }, (_, index) => game(index));
    const previous = trainModel(games, vocabulary);
    const changed = games.map(entry => ({ ...entry, foundWords: [], points: 0 }));
    const refreshed = trainModel(changed, vocabulary, previous);
    expect(refreshed.cohorts[settingsKey(settings)].multipliers).toEqual(previous.cohorts[settingsKey(settings)].multipliers);
    expect(refreshed.cohorts[settingsKey(settings)].words.every(word => word.finds === 0)).toBe(true);
    expect(trainModel(changed, vocabulary).cohorts[settingsKey(settings)].multipliers).not.toEqual(previous.cohorts[settingsKey(settings)].multipliers);
    expect(trainModel(games, vocabulary).version).toBe(previous.version);
    const reordered = JSON.parse(JSON.stringify(previous)) as typeof previous;
    const calibration = reordered.cohorts[settingsKey(settings)].calibration!;
    reordered.cohorts[settingsKey(settings)].calibration = {
      windowDays: calibration.windowDays, boards: calibration.boards, games: calibration.games,
      throughDate: calibration.throughDate, fromDate: calibration.fromDate,
    };
    expect(trainModel(games, vocabulary, reordered).version).toBe(previous.version);
  });

  function datedHistory() {
    const boardWords = [['CATS', 'HATS'], ['DOGS'], ['RATS'], ['BATS'], ['MATS']];
    const recent = Array.from({ length: 50 }, (_, index): SolvedGame => {
      const board = index % 5;
      const words = boardWords[board].map(word => ({ word, points: 2 }));
      const foundWords = board === 0 ? boardWords[board] : [];
      return {
        ...game(index), id: `recent-${index}`, date: '2026-03-01', boardKey: `board-${board}`,
        words, foundWords, points: foundWords.length * 2,
      };
    });
    const older = Array.from({ length: 20 }, (_, index) => ({
      ...recent[0], id: `older-${index}`, date: '2026-01-01',
    }));
    return { recent, older, vocabulary: new Map(boardWords.flat().map(word => [word, 4])) };
  }

  it('excludes every occurrence of the calibration board, including older games outside the window', () => {
    const { recent, older, vocabulary } = datedHistory();
    const cohort = trainModel([...older, ...recent], vocabulary, undefined, '2026-03-20').cohorts[settingsKey(settings)];
    // Once the high-scoring board is removed, the other boards have zero finds.
    // Its two words each contribute 2 × (1 − (0.4×0.5 + 0.6×1)) = 0.4.
    // The game scores 4, so its board-out performance ratio is 4 / 0.8 = 5.
    expect(cohort.multipliers![4]).toBeCloseTo(5);
    expect(cohort.calibration).toMatchObject({ games: 50, boards: 5, windowDays: 60, fromDate: '2026-03-01' });
    // Earlier games still inform word statistics for future runtime boards.
    expect(cohort.words.find(word => word.word === 'CATS')?.opportunities).toBe(30);
  });

  it('falls back to all history when recent games or board diversity are insufficient', () => {
    const { recent, older, vocabulary } = datedHistory();
    const thin = trainModel([...older, ...recent.slice(1)], vocabulary, undefined, '2026-03-20').cohorts[settingsKey(settings)];
    expect(thin.calibration).toMatchObject({ games: 69, boards: 5, windowDays: null, fromDate: '2026-01-01' });
    const recentOneBoard = Array.from({ length: 60 }, (_, index) => ({ ...recent[0], id: `one-${index}` }));
    const olderDiverse = recent.map(entry => ({ ...entry, id: `old-${entry.id}`, date: '2026-01-01' }));
    const concentrated = trainModel([...olderDiverse, ...recentOneBoard], vocabulary, undefined, '2026-03-20').cohorts[settingsKey(settings)];
    expect(concentrated.calibration?.windowDays).toBeNull();
  });

  it('splits dates chronologically and reports unsupported holdout settings', () => {
    const games = Array.from({ length: 200 }, (_, index) => game(index));
    games.push({ ...game(199), settings: { ...settings, timeLimit: 180 } });
    const evaluation = evaluateHistory(games, vocabulary);
    expect(evaluation.splitDate).toBe('2026-01-09');
    expect(evaluation.trainingGames).toBe(160);
    expect(evaluation.holdoutGames).toBe(41);
    expect(evaluation.cohorts[settingsKey(settings)]).toMatchObject({ trainingGames: 160, trainingBoards: 10, supported: 40 });
    expect(evaluation.cohorts[settingsKey({ ...settings, timeLimit: 180 })].achievementRates).toBeNull();
  });
});
