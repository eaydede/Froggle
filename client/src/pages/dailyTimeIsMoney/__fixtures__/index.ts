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
  },
};
