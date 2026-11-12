import { generateSeededBoard } from 'engine/board.js';
import { TIME_IS_MONEY_CONFIG } from 'models/timeIsMoney';

export const TIME_IS_MONEY_LAUNCH_DATE = '2026-07-01';

// Daily puzzle number, counted from launch — "Time is Money #12".
export function getTimeIsMoneyNumber(dateStr: string): number {
  const launch = new Date(TIME_IS_MONEY_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

// Namespaced so the day's board doesn't collide with the timed/zen/gauntlet
// dailies.
export function getTimeIsMoneySeed(dateStr: string): number {
  return fnv1a(`froggle-time-is-money-${dateStr}`);
}

// Today's board. Captured into the row at start-time so a resume always sees
// the same puzzle.
export function prepareTimeIsMoneyBoard(dateStr: string): string[][] {
  return generateSeededBoard(TIME_IS_MONEY_CONFIG.boardSize, getTimeIsMoneySeed(dateStr));
}
