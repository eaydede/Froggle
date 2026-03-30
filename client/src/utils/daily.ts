import { mulberry32 } from 'models/seedCode';

// Launch date: first daily is #1 on this date
// PST = UTC-8, so the "daily day" rolls over at 08:00 UTC
const LAUNCH_DATE = '2026-03-30'; // First daily puzzle
const PST_OFFSET_HOURS = 8;

// Daily config (fixed for all players)
export const DAILY_BOARD_SIZE = 5;
export const DAILY_TIME_LIMIT = 120;
export const DAILY_MIN_WORD_LENGTH = 4;

/**
 * Get the current daily date string in PST (YYYY-MM-DD).
 */
export function getDailyDatePST(): string {
  const now = new Date();
  // Subtract PST offset to get "PST date"
  const pst = new Date(now.getTime() - PST_OFFSET_HOURS * 60 * 60 * 1000);
  return pst.toISOString().slice(0, 10);
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
 * Generate a deterministic seed from a date string.
 * Uses FNV-1a hash of the date string.
 */
export function getDailySeed(dateStr?: string): number {
  const date = dateStr || getDailyDatePST();
  const str = `froggle-daily-${date}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
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
