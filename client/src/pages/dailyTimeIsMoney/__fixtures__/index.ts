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

export const TIME_IS_MONEY_RESULT_FIXTURES: Record<string, TimeIsMoneyResultResponse> = {
  // Only player to finish today — hero stat, no standings panel.
  solo: {
    date: '2026-07-01',
    number: 1,
    board: BOARD_5x5,
    found_words: FOUND,
    missed_words: MISSED,
    points: 34,
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
    points: 34,
    word_count: 6,
    config: CONFIG,
    roster: [
      { userId: 'a', displayName: 'Robin', points: 41, wordCount: 15, rank: 1, isYou: false },
      { userId: 'you', displayName: 'You', points: 34, wordCount: 6, rank: 2, isYou: true },
      { userId: 'b', displayName: 'Sam', points: 34, wordCount: 11, rank: 2, isYou: false },
      { userId: 'c', displayName: 'Jo', points: 19, wordCount: 8, rank: 4, isYou: false },
    ],
  },
};
