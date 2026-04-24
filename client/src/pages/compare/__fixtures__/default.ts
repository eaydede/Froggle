import type { DailyCompareResponse } from '../../../shared/api/gameApi';

const BOARD: string[][] = [
  ['B', 'R', 'O', 'T', 'E'],
  ['L', 'A', 'B', 'R', 'E'],
  ['I', 'O', 'A', 'V', 'P'],
  ['N', 'S', 'O', 'I', 'O'],
  ['A', 'K', 'E', 'L', 'H'],
];

export const defaultCompare: DailyCompareResponse = {
  date: '2026-04-21',
  puzzleNumber: 42,
  board: BOARD,
  config: { boardSize: 5, timeLimit: 120, minWordLength: 3 },
  me: {
    userId: 'me',
    displayName: 'You',
    points: 32,
    wordCount: 14,
    foundWords: [
      { word: 'OVATIONS', score: 11 },
      { word: 'BRAVOS', score: 5 },
      { word: 'ORATES', score: 3 },
      { word: 'ORATE', score: 2 },
      { word: 'BRAVO', score: 2 },
      { word: 'IRATE', score: 2 },
      { word: 'ROTE', score: 1 },
      { word: 'BRAVE', score: 2 },
      { word: 'STAIR', score: 2 },
      { word: 'TRAIT', score: 2 },
      { word: 'RAVEN', score: 2 },
      { word: 'RATE', score: 1 },
      { word: 'EAR', score: 1 },
      { word: 'RAT', score: 1 },
    ],
  },
  them: {
    userId: 'them',
    displayName: 'wordsmith42',
    points: 44,
    wordCount: 12,
    foundWords: [
      { word: 'BRAVOS', score: 5 },
      { word: 'OPIATE', score: 5 },
      { word: 'PAVIOR', score: 5 },
      { word: 'BRAVER', score: 3 },
      { word: 'LABRET', score: 3 },
      { word: 'SKATE', score: 2 },
      { word: 'KALE', score: 2 },
      { word: 'BRAVE', score: 2 },
      { word: 'STAIR', score: 2 },
      { word: 'TRAIT', score: 2 },
      { word: 'RAVEN', score: 2 },
      { word: 'RATE', score: 1 },
    ],
  },
};
