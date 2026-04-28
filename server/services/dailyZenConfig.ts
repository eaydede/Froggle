// Zen mode shares board size + minimum word length with timed daily so
// the engine and scoring rules behave identically. The launch date is
// independent because the two modes have separate puzzle numbering.

export const DAILY_ZEN_LAUNCH_DATE = '2026-04-26';
export const DAILY_ZEN_BOARD_SIZE = 5;
export const DAILY_ZEN_MIN_WORD_LENGTH = 4;

export function getDailyZenNumber(dateStr: string): number {
  const launch = new Date(DAILY_ZEN_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}
