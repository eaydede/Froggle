import type { DailyResults } from '../types';
import type { DailyZenSession } from '../../../shared/api/gameApi';

export interface LandingFixture {
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  dailyConfig: { boardSize: number; timeLimit: number; minWordLength: number };
  zenConfig: { boardSize: number; minWordLength: number };
  dailyResults: DailyResults | null;
  zenSession?: DailyZenSession | null;
  displayName: string;
}

const DAILY_CONFIG = { boardSize: 5, timeLimit: 120, minWordLength: 3 };
const ZEN_CONFIG = { boardSize: 5, minWordLength: 3 };

const TEN_DAYS_ALL: boolean[] = Array(10).fill(true);
const TEN_DAYS_SEVEN: boolean[] = [false, false, false, true, true, true, true, true, true, true];

export const unplayedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: [...TEN_DAYS_ALL.slice(0, 9), false],
  dailyConfig: DAILY_CONFIG,
  zenConfig: ZEN_CONFIG,
  dailyResults: null,
  displayName: 'Wren',
};

export const completedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: TEN_DAYS_ALL,
  dailyConfig: DAILY_CONFIG,
  zenConfig: ZEN_CONFIG,
  dailyResults: { words: 19, points: 142, longestWord: 'STARTLING' },
  displayName: 'Wren',
};

export const partialFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 4,
  streakDays: TEN_DAYS_SEVEN,
  dailyConfig: DAILY_CONFIG,
  zenConfig: ZEN_CONFIG,
  dailyResults: null,
  displayName: 'Wren',
};

export const zenInProgressFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: [...TEN_DAYS_ALL.slice(0, 9), false],
  dailyConfig: DAILY_CONFIG,
  zenConfig: ZEN_CONFIG,
  dailyResults: null,
  zenSession: {
    date: '2026-04-21',
    board: [],
    found_words: [],
    started_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    ended_at: null,
    ended_by_player: false,
    points: 84,
    word_count: 11,
    total_findable: 60,
    longest_word: 'STARLIGHT',
    salt: '',
    wordHashes: [],
  },
  displayName: 'Wren',
};

export const zenEndedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: TEN_DAYS_ALL,
  dailyConfig: DAILY_CONFIG,
  zenConfig: ZEN_CONFIG,
  dailyResults: { words: 19, points: 142, longestWord: 'STARTLING' },
  zenSession: {
    date: '2026-04-21',
    board: [],
    found_words: [],
    started_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    ended_by_player: true,
    points: 198,
    word_count: 24,
    total_findable: 60,
    longest_word: 'STARLIGHT',
    salt: '',
    wordHashes: [],
  },
  displayName: 'Wren',
};
