import { GameState, type Game } from 'models';
import type { GameResults } from '../../../shared/types';

// Canned results payload used by the dev-only `?mock=default` branch in
// ResultsRoute. The words span every score tier the page renders — 1pt,
// 2pt, 3pt, 5pt, and the 11pt gold tier — plus a long "longestFoundWord"
// so the banner appears. A handful of missed words drive the collapsed /
// expanded word-list states. Paths are plausible adjacent traversals but
// are not strictly reproducible from the board letters; adjacency accuracy
// is not the point of a visual-regression fixture.

const BOARD: string[][] = [
  ['S', 'T', 'A', 'R', 'E'],
  ['H', 'I', 'N', 'T', 'S'],
  ['O', 'U', 'L', 'E', 'D'],
  ['P', 'A', 'R', 'T', 'Y'],
  ['L', 'I', 'O', 'N', 'S'],
];

export const defaultFixture: GameResults = {
  board: BOARD,
  foundWords: [
    // 1pt — 3-4 letters
    { word: 'ART', score: 1, path: [{ row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 3 }] },
    { word: 'TAR', score: 1, path: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    { word: 'STAR', score: 1, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    { word: 'PART', score: 1, path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }] },
    // 2pt — 5 letters
    { word: 'STARE', score: 2, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }] },
    { word: 'HINTS', score: 2, path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }] },
    { word: 'LIONS', score: 2, path: [{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }] },
    // 3pt — 6 letters
    { word: 'PARTLY', score: 3, path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 4 }] },
    { word: 'STARED', score: 3, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 2, col: 4 }] },
    // 5pt — 7 letters
    { word: 'STARTED', score: 5, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 2, col: 3 }, { row: 2, col: 4 }] },
    // 11pt — 8+ letters (gold glow)
    { word: 'STARTLING', score: 11, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 1, col: 4 }, { row: 2, col: 4 }, { row: 3, col: 3 }, { row: 3, col: 2 }] },
  ],
  missedWords: [
    { word: 'NEST', score: 1, path: [{ row: 1, col: 2 }, { row: 0, col: 4 }, { row: 1, col: 4 }, { row: 0, col: 3 }] },
    { word: 'TIES', score: 1, path: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 4 }, { row: 1, col: 4 }] },
    { word: 'HINT', score: 1, path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }] },
    { word: 'TRIPS', score: 2, path: [{ row: 0, col: 1 }, { row: 0, col: 3 }, { row: 1, col: 1 }, { row: 3, col: 0 }, { row: 1, col: 4 }] },
    { word: 'PARTIES', score: 5, path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 1, col: 1 }, { row: 0, col: 4 }, { row: 1, col: 4 }] },
  ],
};

export const defaultGame: Game = {
  board: BOARD,
  startedAt: 0,
  status: GameState.Finished,
  config: {
    durationSeconds: 180,
    boardSize: 5,
    minWordLength: 3,
  },
};
