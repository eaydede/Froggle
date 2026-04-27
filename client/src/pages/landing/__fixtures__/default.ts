import type { DailyResults } from '../types';
import type { DailyRelaxedSession } from '../../../shared/api/gameApi';

export interface LandingFixture {
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  dailyResults: DailyResults | null;
  relaxedSession?: DailyRelaxedSession | null;
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
