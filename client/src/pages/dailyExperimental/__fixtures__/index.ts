import { GOLDEN_TILE } from 'models/experimental';
import type { ExperimentalResultResponse } from '../../../shared/api/dailyExperimentalApi';

// Dev-only canned results so the experimental results screen (a stateful page
// that normally needs a played + finalized session) is reachable in one click
// for visual checks. Open `/daily/experimental/<mode>/results?mock=<key>`.

const NORMAL_BOARD_5x5: string[][] = [
  ['S', 'T', 'A', 'R', 'E'],
  ['L', 'I', 'N', 'O', 'D'],
  ['P', 'E', 'S', 'T', 'M'],
  ['A', 'C', 'H', 'I', 'N'],
  ['G', 'O', 'L', 'D', 'E'],
];

// Golden Ticket board: center cell holds the wildcard marker so the preview
// board renders the golden star overlay in its actual position.
const GOLDEN_BOARD_5x5: string[][] = [
  ['C', 'A', 'R', 'E', 'S'],
  ['O', 'T', 'A', 'N', 'D'],
  ['B', 'L', GOLDEN_TILE, 'I', 'T'],
  ['E', 'S', 'N', 'M', 'P'],
  ['R', 'O', 'A', 'D', 'S'],
];

const ROSTER = [
  { userId: 'you', displayName: 'You', points: 34, wordCount: 12, rank: 2, isYou: true },
  { userId: 'a', displayName: 'Robin', points: 41, wordCount: 15, rank: 1, isYou: false },
  { userId: 'b', displayName: 'Sam', points: 34, wordCount: 11, rank: 2, isYou: false },
  { userId: 'c', displayName: 'Jo', points: 19, wordCount: 8, rank: 4, isYou: false },
];

export const EXPERIMENTAL_RESULT_FIXTURES: Record<string, ExperimentalResultResponse> = {
  // Time is Money — headline is time survived; standings show mm:ss.
  money: {
    mode: 'time-is-money',
    date: '2026-07-01',
    number: 1,
    board: NORMAL_BOARD_5x5,
    state: {},
    found_words: ['STARE', 'PEST', 'NEST', 'CHIN', 'GOLD', 'RIOT'],
    missed_words: [{ word: 'STARED', path: [], score: 8 }],
    points: 34,
    word_count: 12,
    config: { boardSize: 5, minWordLength: 3, timeLimit: 60 },
    roster: ROSTER,
    vote: 'up',
    voteTallies: { up: 12, meh: 4, down: 2 },
  },
  // Golden Ticket — pared-down results, golden tile visible on the preview
  // board, golden-aware missed-words list.
  golden: {
    mode: 'golden-ticket',
    date: '2026-07-01',
    number: 1,
    board: GOLDEN_BOARD_5x5,
    state: {},
    found_words: ['CARES', 'BOATS'],
    missed_words: [
      { word: 'ROADS', path: [{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }], score: 3 },
      // Golden-path missed words routed through the center [2][2].
      { word: 'BLAST', path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 }], score: 3 },
      { word: 'PLANT', path: [{ row: 3, col: 4 }, { row: 2, col: 4 }, { row: 2, col: 3 }, { row: 2, col: 2 }, { row: 3, col: 3 }], score: 3 },
    ],
    points: 6,
    word_count: 2,
    config: { boardSize: 5, minWordLength: 5, timeLimit: 120 },
    roster: ROSTER,
    vote: 'meh',
    voteTallies: { up: 8, meh: 6, down: 3 },
  },
};
