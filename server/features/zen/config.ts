// Zen has its own fixed config — independent of timed daily, which
// randomizes board size and min-length per day. Routing reads through
// `getDailyZenConfig` so a future change to per-day variation only needs
// to touch this file.

export const DAILY_ZEN_LAUNCH_DATE = '2026-04-26';

export interface DailyZenConfig {
  boardSize: number;
  minWordLength: number;
}

const FIXED_CONFIG: DailyZenConfig = {
  boardSize: 5,
  minWordLength: 4,
};

export function getDailyZenConfig(_dateStr: string): DailyZenConfig {
  return { ...FIXED_CONFIG };
}

export function getDailyZenNumber(dateStr: string): number {
  const launch = new Date(DAILY_ZEN_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}
