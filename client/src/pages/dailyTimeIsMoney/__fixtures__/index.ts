import type { TimeIsMoneyResultResponse } from '../../../shared/api/timeIsMoneyApi';

// Dev-only canned results so the Time is Money results screen (a stateful page
// that normally needs a played + finalized session) is reachable in one click
// for visual checks. Open `/daily/time-is-money/results?mock=<key>`.

const BOARD_5x5: string[][] = [
  ['S', 'T', 'A', 'R', 'E'],
  ['L', 'I', 'N', 'O', 'D'],
  ['P', 'E', 'S', 'T', 'M'],
  ['A', 'C', 'H', 'I', 'N'],
  ['G', 'O', 'L', 'D', 'E'],
];

const FOUND = ['STARE', 'PEST', 'NEST', 'CHIN', 'GOLD', 'RIOT'];
const MISSED = [{ word: 'STARED', path: [], score: 8 }];
const CONFIG = { boardSize: 5, minWordLength: 3, timeLimit: 60 };

// Per-word find rate (% of today's finishers) so the popularity affordance is
// visible in dev. Keyed by upper-cased word like the server payload.
const FIND_PERCENTS: Record<string, number> = {
  PEST: 88,
  NEST: 74,
  GOLD: 61,
  RIOT: 45,
  CHIN: 30,
  STARE: 12,
  STARED: 4,
};

// Sum of scoreWord over FOUND. The server derives points the same way, so a
// fixture that disagrees would show one total in the hero and another in the
// share text — keep this in step with FOUND.
const POINTS = 13;

export const TIME_IS_MONEY_RESULT_FIXTURES: Record<string, TimeIsMoneyResultResponse> = {
  // Only player to finish today — hero stat, no standings panel.
  solo: {
    date: '2026-07-01',
    number: 1,
    board: BOARD_5x5,
    found_words: FOUND,
    missed_words: MISSED,
    points: POINTS,
    word_count: 6,
    config: CONFIG,
    roster: [],
    find_percents: FIND_PERCENTS,
  },
  // Populated day — standings render mm:ss rather than raw points.
  standings: {
    date: '2026-07-01',
    number: 1,
    board: BOARD_5x5,
    found_words: FOUND,
    missed_words: MISSED,
    points: POINTS,
    word_count: 6,
    config: CONFIG,
    roster: [
      { userId: 'a', displayName: 'Robin', points: 20, wordCount: 9, rank: 1, isYou: false },
      // Ties with Sam, so the shared rank rendering stays exercised.
      { userId: 'you', displayName: 'You', points: POINTS, wordCount: 6, rank: 2, isYou: true },
      { userId: 'b', displayName: 'Sam', points: POINTS, wordCount: 7, rank: 2, isYou: false },
      { userId: 'c', displayName: 'Jo', points: 8, wordCount: 4, rank: 4, isYou: false },
    ],
    find_percents: FIND_PERCENTS,
  },
};

// Canned opponent word lists for the `standings` fixture, keyed by roster
// userId, so tapping a name in dev opens the same compare view real play
// would. Points/wordCount match the roster rows above. Words overlap the
// viewer's FOUND list so the shared/unique split in the aligned lists shows.
export const TIME_IS_MONEY_OPPONENT_FIXTURES: Record<
  string,
  { displayName: string; points: number; wordCount: number; foundWords: { word: string; score: number }[] }
> = {
  a: {
    displayName: 'Robin',
    points: 20,
    wordCount: 9,
    foundWords: [
      { word: 'STARE', score: 2 },
      { word: 'PEST', score: 2 },
      { word: 'NEST', score: 2 },
      { word: 'CHIN', score: 2 },
      { word: 'GOLD', score: 2 },
      { word: 'RIOT', score: 2 },
      { word: 'STONE', score: 3 },
      { word: 'SNORE', score: 3 },
      { word: 'TRIED', score: 2 },
    ],
  },
  b: {
    displayName: 'Sam',
    points: 13,
    wordCount: 7,
    foundWords: [
      { word: 'STARE', score: 2 },
      { word: 'PEST', score: 2 },
      { word: 'NEST', score: 2 },
      { word: 'CHIN', score: 2 },
      { word: 'GOLD', score: 1 },
      { word: 'RIOT', score: 2 },
      { word: 'DINE', score: 2 },
    ],
  },
  c: {
    displayName: 'Jo',
    points: 8,
    wordCount: 4,
    foundWords: [
      { word: 'PEST', score: 2 },
      { word: 'NEST', score: 2 },
      { word: 'GOLD', score: 2 },
      { word: 'RIOT', score: 2 },
    ],
  },
};
