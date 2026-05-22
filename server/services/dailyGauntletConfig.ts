import { generateSeededBoard } from 'engine/board.js';
import type { Board } from 'models';
import {
  DEFAULT_RARE_LETTER_VALUES,
  GAUNTLET_ROUND_COUNT,
  type GauntletModifier,
  type GauntletRoundConfig,
  type GauntletRoundKind,
} from 'models/gauntlet';
import { mulberry32 } from 'models/seedCode';

export const DAILY_GAUNTLET_LAUNCH_DATE = '2026-05-21';

interface RoundShape {
  kind: GauntletRoundKind;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

// Round configs are fixed up front. The three rounds are deliberately
// distinct in board size + modifier so each round has a single, legible
// twist. We keep min_word_length and time_limit identical across rounds
// so the only thing the player has to learn round-to-round is the
// modifier — board geometry and pacing stay stable.
const ROUND_SHAPES: Readonly<Record<number, RoundShape>> = {
  0: { kind: 'regular', boardSize: 4, timeLimit: 120, minWordLength: 4 },
  1: { kind: 'hotLetter', boardSize: 5, timeLimit: 120, minWordLength: 4 },
  2: { kind: 'rareLetters', boardSize: 5, timeLimit: 120, minWordLength: 4 },
};

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export function getGauntletRoundSeed(dateStr: string, index: number): number {
  return fnv1a(`froggle-gauntlet-${dateStr}-${index}`);
}

export function getDailyGauntletNumber(dateStr: string): number {
  const launch = new Date(DAILY_GAUNTLET_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

// Pick a hot letter by sampling cell *characters* uniformly. A Qu tile
// contributes both Q and U as independent candidates, so a one-off Qu
// gives equal odds to either letter. This naturally weights toward
// letters that show up more often on the board, which keeps the
// modifier impactful instead of landing on a single Z most words avoid.
function pickHotLetter(board: Board, prng: () => number): string {
  const chars: string[] = [];
  for (const row of board) {
    for (const cell of row) {
      for (const ch of cell.toUpperCase()) chars.push(ch);
    }
  }
  return chars[Math.floor(prng() * chars.length)] ?? 'E';
}

function buildModifier(
  kind: GauntletRoundKind,
  board: Board,
  prng: () => number,
): GauntletModifier {
  switch (kind) {
    case 'regular':
      return { kind: 'regular' };
    case 'hotLetter':
      return { kind: 'hotLetter', letter: pickHotLetter(board, prng), multiplier: 2 };
    case 'rareLetters':
      return { kind: 'rareLetters', values: { ...DEFAULT_RARE_LETTER_VALUES } };
  }
}

export interface PreparedGauntletRound {
  config: GauntletRoundConfig;
  board: Board;
  seed: number;
}

export function prepareGauntletRound(
  dateStr: string,
  index: number,
): PreparedGauntletRound {
  const shape = ROUND_SHAPES[index];
  if (!shape) throw new Error(`Invalid gauntlet round index: ${index}`);
  const seed = getGauntletRoundSeed(dateStr, index);
  const board = generateSeededBoard(shape.boardSize, seed);
  // Derive modifier RNG from a transformation of the seed so the modifier
  // and the board don't share the same PRNG stream — picking the hot
  // letter shouldn't be perfectly correlated with the board's first cell.
  const prng = mulberry32((seed ^ 0xa5a5a5a5) >>> 0);
  const modifier = buildModifier(shape.kind, board, prng);
  return {
    config: { ...shape, index, modifier },
    board,
    seed,
  };
}

export function prepareAllGauntletRounds(dateStr: string): PreparedGauntletRound[] {
  const rounds: PreparedGauntletRound[] = [];
  for (let i = 0; i < GAUNTLET_ROUND_COUNT; i++) {
    rounds.push(prepareGauntletRound(dateStr, i));
  }
  return rounds;
}
