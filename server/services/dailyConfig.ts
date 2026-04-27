import { getDailySeed, mulberry32 } from 'models/seedCode';

export const DAILY_LAUNCH_DATE = '2026-04-10';

// First date for which the daily puzzle uses randomized config. Earlier dates
// were all played at the legacy fixed config and must keep returning it so
// stored results stay consistent with how they were played.
export const FIRST_RANDOMIZED_DATE = '2026-04-27';

const LEGACY_CONFIG: DailyConfig = {
  boardSize: 5,
  timeLimit: 120,
  minWordLength: 4,
};

export interface DailyConfig {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

// Explicit (boardSize, minWordLength) pairs. Independent rolls produced
// awkward combos (4×4 + min 5 too sparse, 6×6 + min 3 trivial-word soup),
// so the rotation lives in one table that's easy to tune.
const BOARD_COMBOS: Array<{ boardSize: number; minWordLength: number }> = [
  { boardSize: 4, minWordLength: 3 },
  { boardSize: 4, minWordLength: 4 },
  { boardSize: 5, minWordLength: 3 },
  { boardSize: 5, minWordLength: 4 },
  { boardSize: 5, minWordLength: 5 },
  { boardSize: 6, minWordLength: 4 },
  { boardSize: 6, minWordLength: 5 },
];
const TIME_LIMITS = [60, 120];

export function dailyConfigFromSeed(seed: number): DailyConfig {
  const prng = mulberry32(seed);
  const combo = BOARD_COMBOS[Math.floor(prng() * BOARD_COMBOS.length)];
  const timeLimit = TIME_LIMITS[Math.floor(prng() * TIME_LIMITS.length)];
  return { ...combo, timeLimit };
}

export function getDailyConfig(dateStr: string): DailyConfig {
  if (dateStr < FIRST_RANDOMIZED_DATE) return { ...LEGACY_CONFIG };
  return dailyConfigFromSeed(getDailySeed(dateStr));
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
