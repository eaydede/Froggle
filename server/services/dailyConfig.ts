import { getDailySeed, mulberry32 } from 'models/seedCode.js';

export const DAILY_LAUNCH_DATE = '2026-04-10';

export interface DailyConfig {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

const BOARD_SIZES = [4, 5, 6];
const TIME_LIMITS = [60, 90, 120, 150, 180];
const MIN_WORD_LENGTHS = [3, 4, 5];

export function getDailyConfig(dateStr: string): DailyConfig {
  const seed = getDailySeed(dateStr);
  const prng = mulberry32(seed);

  const boardSize = BOARD_SIZES[Math.floor(prng() * BOARD_SIZES.length)];
  const timeLimit = TIME_LIMITS[Math.floor(prng() * TIME_LIMITS.length)];
  const minWordLength = MIN_WORD_LENGTHS[Math.floor(prng() * MIN_WORD_LENGTHS.length)];

  return { boardSize, timeLimit, minWordLength };
}

export function getDailyDatePST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function getDailyNumber(dateStr: string): number {
  const launch = new Date(DAILY_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}
