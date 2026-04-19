export const DAILY_LAUNCH_DATE = '2026-04-10';
export const DAILY_BOARD_SIZE = 5;
export const DAILY_TIME_LIMIT = 120;
export const DAILY_MIN_WORD_LENGTH = 4;

export function getDailyDatePST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function getDailyNumber(dateStr: string): number {
  const launch = new Date(DAILY_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}
