import { GameState, type Game } from 'models';
import type { GameResults } from '../../../shared/types';
import type { DailyResultsExtras } from '../ResultsPage';

// Canned daily-results payload used by the dev-only `?mock=daily` branch in
// ResultsRoute. Words span every rarity tier so the stripes are visible.
// Paths are left empty because this fixture doesn't exercise path highlights
// (the production daily flow has the same limitation — stored results lose
// their paths).

const BOARD: string[][] = [
  ['S', 'T', 'A', 'R', 'E'],
  ['O', 'N', 'I', 'P', 'D'],
  ['E', 'L', 'A', 'C', 'H'],
  ['T', 'R', 'I', 'O', 'N'],
  ['K', 'E', 'A', 'M', 'P'],
];

export const dailyDefaultFixture: GameResults = {
  board: BOARD,
  foundWords: [
    { word: 'CAPTIONS', score: 11, path: [] },
    { word: 'CAPTION', score: 5, path: [] },
    { word: 'PATRON', score: 3, path: [] },
    { word: 'TRAINS', score: 3, path: [] },
    { word: 'STRAIN', score: 3, path: [] },
    { word: 'TRAIN', score: 2, path: [] },
    { word: 'STARE', score: 2, path: [] },
    { word: 'PAINT', score: 2, path: [] },
    { word: 'IRATE', score: 2, path: [] },
    { word: 'TACIT', score: 2, path: [] },
    { word: 'TRIO', score: 1, path: [] },
    { word: 'RATE', score: 1, path: [] },
    { word: 'ATE', score: 1, path: [] },
    { word: 'TAN', score: 1, path: [] },
  ],
  missedWords: [],
};

export const dailyDefaultGame: Game = {
  board: BOARD,
  startedAt: 0,
  status: GameState.Finished,
  config: {
    durationSeconds: 120,
    boardSize: 5,
    minWordLength: 3,
  },
};

export const dailyDefaultExtras: DailyResultsExtras = {
  dateLabel: 'Tuesday, Apr 21',
  leaderboardTop: [
    { rank: 1, name: 'wordsmith42', score: 218 },
    { rank: 2, name: 'lexicon', score: 201 },
  ],
  leaderboardYou: { rank: 47, name: 'you', score: 142 },
  onOpenLeaderboard: () => {},
};
