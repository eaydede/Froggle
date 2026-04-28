import type { DailyResults } from '../types';
import type { DailyZenSession } from '../../../shared/api/gameApi';

export interface LandingFixture {
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  dailyResults: DailyResults | null;
  zenSession?: DailyZenSession | null;
  displayName: string;
}

const TEN_DAYS_ALL: boolean[] = Array(10).fill(true);
const TEN_DAYS_SEVEN: boolean[] = [false, false, false, true, true, true, true, true, true, true];

export const unplayedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: [...TEN_DAYS_ALL.slice(0, 9), false],
  dailyResults: null,
  displayName: 'Wren',
};

export const completedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: TEN_DAYS_ALL,
  dailyResults: { words: 19, points: 142, longestWord: 'STARTLING' },
  displayName: 'Wren',
};

export const partialFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 4,
  streakDays: TEN_DAYS_SEVEN,
  dailyResults: null,
  displayName: 'Wren',
};

export const zenInProgressFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: [...TEN_DAYS_ALL.slice(0, 9), false],
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
  },
  displayName: 'Wren',
};

export const zenEndedFixture: LandingFixture = {
  dateLabel: 'Tue · Apr 21',
  streak: 9,
  streakDays: TEN_DAYS_ALL,
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
  },
  displayName: 'Wren',
};
