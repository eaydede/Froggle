import { generateSeededBoard } from 'engine/board.js';
import {
  EXPERIMENTAL_MODES,
  GOLDEN_TILE,
  goldenCell,
  type ExperimentalModeKey,
  type ExperimentalModeState,
} from 'models/experimental';

export const EXPERIMENTAL_LAUNCH_DATE = '2026-07-01';

// Daily puzzle number for an experimental mode, counted from launch. All modes
// share the launch date so "Experimental #12" reads the same across the group.
export function getExperimentalNumber(dateStr: string): number {
  const launch = new Date(EXPERIMENTAL_LAUNCH_DATE + 'T00:00:00Z');
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

// Namespaced per mode so each experimental variant gets a distinct board for a
// given day, and none collide with the timed/zen/gauntlet dailies.
export function getExperimentalSeed(modeKey: ExperimentalModeKey, dateStr: string): number {
  return fnv1a(`froggle-experimental-${modeKey}-${dateStr}`);
}

export interface PreparedExperimentalBoard {
  board: string[][];
  boardSize: number;
  minWordLength: number;
  timeLimit: number;
  state: ExperimentalModeState;
}

// Board + config + initial mode state for today's puzzle in a given mode. The
// board is captured into the row at start-time so a resume always sees the
// same puzzle. Golden Ticket overwrites the center cell with the wildcard
// marker so downstream code (normal solver, board renderer, path validator)
// treats that cell uniformly.
export function prepareExperimentalBoard(
  modeKey: ExperimentalModeKey,
  dateStr: string,
): PreparedExperimentalBoard {
  const meta = EXPERIMENTAL_MODES[modeKey];
  const seed = getExperimentalSeed(modeKey, dateStr);
  const board = generateSeededBoard(meta.boardSize, seed);

  if (modeKey === 'golden-ticket') {
    const center = goldenCell(meta.boardSize);
    board[center.row][center.col] = GOLDEN_TILE;
  }

  return {
    board,
    boardSize: meta.boardSize,
    minWordLength: meta.minWordLength,
    timeLimit: meta.timeLimit,
    state: {},
  };
}
