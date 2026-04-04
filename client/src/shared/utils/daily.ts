import { getDailySeed } from 'models/seedCode';

// Launch date: first daily is #1 on this date
const LAUNCH_DATE = '2026-03-30'; // First daily puzzle

// Daily config (fixed for all players)
export const DAILY_BOARD_SIZE = 5;
export const DAILY_TIME_LIMIT = 120;
export const DAILY_MIN_WORD_LENGTH = 4;

/**
 * Get the current daily date string in Pacific time (YYYY-MM-DD).
 * Uses America/Los_Angeles timezone which handles PST/PDT automatically.
 */
export function getDailyDatePST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

/**
 * Get the daily puzzle number for a given date string.
 * #1 = LAUNCH_DATE, counts up from there.
 */
export function getDailyNumber(dateStr?: string): number {
  const date = dateStr || getDailyDatePST();
  const launch = new Date(LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(date + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

/**
 * Get full daily info for today (or a specific date).
 */
export function getDailyInfo(dateStr?: string) {
  const date = dateStr || getDailyDatePST();
  return {
    date,
    number: getDailyNumber(date),
    seed: getDailySeed(date),
    boardSize: DAILY_BOARD_SIZE,
    timeLimit: DAILY_TIME_LIMIT,
    minWordLength: DAILY_MIN_WORD_LENGTH,
  };
}
