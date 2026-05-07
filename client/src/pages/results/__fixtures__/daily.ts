import { GameState, type Game } from 'models';
import type { GameResults } from '../../../shared/types';
import type { DailyResultsExtras } from '../ResultsPage';
import type { DailyEntry } from '../../daily/types';

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
    { word: 'CAPTIONS', score: 13, path: [] },
    { word: 'CAPTION', score: 8, path: [] },
    { word: 'PATRON', score: 5, path: [] },
    { word: 'TRAINS', score: 5, path: [] },
    { word: 'STRAIN', score: 5, path: [] },
    { word: 'TRAIN', score: 3, path: [] },
    { word: 'STARE', score: 3, path: [] },
    { word: 'PAINT', score: 3, path: [] },
    { word: 'IRATE', score: 3, path: [] },
    { word: 'TACIT', score: 3, path: [] },
    { word: 'TRIO', score: 2, path: [] },
    { word: 'RATE', score: 2, path: [] },
    { word: 'ATE', score: 1, path: [] },
    { word: 'TAN', score: 1, path: [] },
  ],
  missedWords: [
    { word: 'CAPTAINS', score: 13, path: [] },
    { word: 'PARTITION', score: 13, path: [] },
    { word: 'ATTAIN', score: 5, path: [] },
    { word: 'CARTON', score: 5, path: [] },
    { word: 'ACTION', score: 5, path: [] },
    { word: 'NATION', score: 5, path: [] },
    { word: 'PLAIT', score: 3, path: [] },
    { word: 'CAIRN', score: 3, path: [] },
    { word: 'CLAIM', score: 3, path: [] },
    { word: 'PITA', score: 2, path: [] },
    { word: 'ICAP', score: 2, path: [] },
    { word: 'ANT', score: 1, path: [] },
    { word: 'NIP', score: 1, path: [] },
    { word: 'OAR', score: 1, path: [] },
  ],
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

const stubConfig = { boardSize: 5, timeLimit: 120, minWordLength: 3 };

const pickerEntries: DailyEntry[] = [
  {
    puzzleNumber: 14,
    date: new Date('2026-04-21T12:00:00'),
    state: 'completed',
    points: 142,
    wordsFound: 19,
    longestWord: 'CAPTIONS',
    longestWordDefinition: null,
    stampTier: 'top30',
    playersCount: 38,
    config: stubConfig,
  },
  {
    puzzleNumber: 13,
    date: new Date('2026-04-20T12:00:00'),
    state: 'completed',
    points: 91,
    wordsFound: 15,
    longestWord: 'BRIDGE',
    longestWordDefinition: null,
    stampTier: null,
    playersCount: 42,
    config: stubConfig,
  },
  {
    puzzleNumber: 12,
    date: new Date('2026-04-19T12:00:00'),
    state: 'missed',
    stampTier: null,
    playersCount: 29,
    config: stubConfig,
  },
  {
    puzzleNumber: 11,
    date: new Date('2026-04-18T12:00:00'),
    state: 'completed',
    points: 78,
    wordsFound: 12,
    longestWord: 'CANDLE',
    longestWordDefinition: null,
    stampTier: 'first',
    playersCount: 31,
    config: stubConfig,
  },
  {
    puzzleNumber: 10,
    date: new Date('2026-04-17T12:00:00'),
    state: 'completed',
    points: 104,
    wordsFound: 17,
    longestWord: 'PLATES',
    longestWordDefinition: null,
    stampTier: 'top30',
    playersCount: 47,
    config: stubConfig,
  },
  {
    puzzleNumber: 9,
    date: new Date('2026-04-16T12:00:00'),
    state: 'missed',
    stampTier: null,
    playersCount: 35,
    config: stubConfig,
  },
  {
    puzzleNumber: 8,
    date: new Date('2026-04-15T12:00:00'),
    state: 'completed',
    points: 88,
    wordsFound: 14,
    longestWord: 'CLAMP',
    longestWordDefinition: null,
    stampTier: null,
    playersCount: 26,
    config: stubConfig,
  },
];

// Stand-in popularity numbers — calibrated so the spread is plausible:
// short common words near 90%+, mid-tier in the 30–60% range, the long
// rare finds in the single digits or below 1%.
export const dailyFindPercents: Record<string, number> = {
  CAPTIONS: 0.4,
  CAPTION: 4,
  PATRON: 11,
  TRAINS: 38,
  STRAIN: 22,
  TRAIN: 71,
  STARE: 64,
  PAINT: 58,
  IRATE: 9,
  TACIT: 2,
  TRIO: 81,
  RATE: 92,
  ATE: 97,
  TAN: 89,
  // missed
  CAPTAINS: 0.2,
  PARTITION: 1,
  ATTAIN: 14,
  CARTON: 27,
  ACTION: 49,
  NATION: 36,
  PLAIT: 6,
  CAIRN: 3,
  CLAIM: 31,
  PITA: 44,
  ICAP: 0.4,
  ANT: 78,
  NIP: 52,
  OAR: 41,
};

export const dailyDefaultExtras: DailyResultsExtras = {
  dateLabel: 'Timed Daily · Tue, Apr 21',
  leaderboardTop: [
    { rank: 1, name: 'wordsmith42', score: 218 },
    { rank: 2, name: 'lexicon', score: 201 },
  ],
  leaderboardYou: { rank: 47, name: 'you', score: 142 },
  onOpenLeaderboard: () => {},
  pickerEntries,
  onPickerSelect: () => {},
  todayDate: '2026-04-21',
  selectedDate: '2026-04-21',
};
