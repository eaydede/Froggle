// Sampling and board generation. Mirrors scripts/calibrate-letters.ts so the
// test bench reproduces the same numbers given the same weights.

import type { Board } from 'models';
import type { PoolConfig, PoolWeights } from './types';

// The current production dice, copied here so the test bench can produce a
// baseline_dice column for visual comparison without importing engine/.
export const DICE_BY_SIZE: Record<number, string[][]> = {
  4: [
    ['A','A','F','K','P','S'], ['A','A','E','E','G','N'], ['A','V','I','D','Y','N'],
    ['C','M','P','F','E','D'], ['I','C','N','S','S','P'], ['D','R','L','G','E','U'],
    ['P','C','K','H','D','Qu'], ['B','U','E','C','L','S'], ['E','M','N','I','Q','Z'],
    ['B','G','L','E','N','Y'], ['O','U','T','E','S','P'], ['A','H','M','O','C','S'],
    ['T','I','I','L','Z','R'], ['R','D','E','L','L','O'], ['H','N','I','R','T','L'],
    ['I','D','R','T','Y','L'],
  ],
  5: [
    ['A','A','A','F','R','S'], ['A','A','E','E','E','E'], ['A','A','F','I','R','S'],
    ['A','D','E','N','N','N'], ['A','E','E','E','E','M'], ['A','E','E','G','M','U'],
    ['A','E','G','M','N','N'], ['A','F','I','R','S','Y'], ['B','J','K','Qu','X','Z'],
    ['C','C','E','N','S','T'], ['C','E','I','I','L','T'], ['C','E','I','L','P','T'],
    ['C','E','I','P','S','T'], ['D','D','H','N','O','T'], ['D','H','H','L','O','R'],
    ['D','H','L','N','O','R'], ['D','H','L','N','O','R'], ['E','I','I','I','T','T'],
    ['E','M','O','T','T','T'], ['E','N','S','S','S','U'], ['F','I','P','R','S','Y'],
    ['G','O','R','R','V','W'], ['I','P','R','R','R','Y'], ['N','O','O','T','U','W'],
    ['O','O','O','T','T','U'],
  ],
  6: [
    ['A','A','A','F','R','S'], ['A','A','E','E','E','E'], ['A','A','E','E','O','O'],
    ['A','A','F','I','R','S'], ['A','B','D','E','I','O'], ['A','D','E','N','N','N'],
    ['A','E','E','E','E','M'], ['A','E','E','G','M','U'], ['A','E','G','M','N','N'],
    ['A','F','I','R','S','Y'], ['A','N','O','T','H','E'], ['B','J','K','Qu','X','Z'],
    ['C','C','E','N','S','T'], ['C','D','D','L','N','N'], ['C','E','I','I','L','T'],
    ['C','E','I','L','P','T'], ['C','E','I','P','S','T'], ['C','F','G','N','U','Y'],
    ['D','D','H','N','O','T'], ['D','H','H','L','O','R'], ['D','H','H','N','O','W'],
    ['D','H','L','N','O','R'], ['E','H','I','L','R','S'], ['E','I','I','L','S','T'],
    ['E','I','L','P','S','T'], ['E','I','O','Qu','U','V'], ['E','M','O','T','T','T'],
    ['E','N','S','S','S','U'], ['F','I','P','R','S','Y'], ['G','O','R','R','V','W'],
    ['H','I','P','R','R','Y'], ['I','N','Qu','U','M','N'], ['L','E','E','S','T','R'],
    ['N','O','O','T','U','W'], ['O','O','O','T','T','U'], ['O','S','S','O','T','T'],
  ],
};

// Letter categorization for the three-pool model. Backbones are the
// consonants that drive most common-word formation (-ER, -ED, -ING, plurals).
// Everything else (including Y, Qu via Q, J, X, Z) lives in "others".
export const VOWEL_LETTERS = ['A', 'E', 'I', 'O', 'U'] as const;
export const BACKBONE_LETTERS = ['T', 'S', 'R', 'N', 'L', 'D'] as const;
export const OTHER_LETTERS = [
  'B', 'C', 'F', 'G', 'H', 'J', 'K', 'M', 'P', 'Q', 'V', 'W', 'X', 'Y', 'Z',
] as const;

// H8 defaults — these match the winning model from the script. Within each
// pool, weights are Norvig text frequencies with rare-letter floor (J/X/Z =
// 0.5) and Q bumped to 1.5 for Qu tile rate. The script uses per-size
// dice-derived weights — those produce slightly different per-cell mixes,
// but Norvig-style ones are a clean, reasonable starting point that the
// user can tune.
export function defaultVowelWeights(): PoolWeights {
  return { A: 8.2, E: 12.7, I: 7.0, O: 7.5, U: 2.8 };
}

export function defaultBackboneWeights(): PoolWeights {
  return { T: 9.1, S: 6.3, R: 6.0, N: 6.7, L: 4.0, D: 4.3 };
}

export function defaultOtherWeights(): PoolWeights {
  return {
    H: 6.1, C: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
    P: 1.9, B: 1.5, V: 1.0, K: 0.8,
    J: 0.5, X: 0.5, Q: 1.5, Z: 0.5,
  };
}

// Per-board V/B/O quotas (V + B + O = size²). Tuned via grid search against
// the metrics suite (common-word count, length-6+, coverage, concentration).
// Constraint: no metric regression vs baseline_dice.
//   4×4: B bumped 6→7 (one more backbone)
//   5×5: unchanged — H8 default is local-search optimal
//   6×6: V→13, B→14 (swap 1 vowel for 1 backbone)
export const DEFAULT_QUOTAS_BY_SIZE: Record<number, { V: number; B: number; O: number }> = {
  4: { V: 5, B: 7, O: 4 },
  5: { V: 10, B: 9, O: 6 },
  6: { V: 13, B: 14, O: 9 },
};

export function defaultPoolConfig(): PoolConfig {
  return {
    vowel: defaultVowelWeights(),
    backbone: defaultBackboneWeights(),
    other: defaultOtherWeights(),
    quotasBySize: {
      4: { ...DEFAULT_QUOTAS_BY_SIZE[4] },
      5: { ...DEFAULT_QUOTAS_BY_SIZE[5] },
      6: { ...DEFAULT_QUOTAS_BY_SIZE[6] },
    },
  };
}

export interface Sampler { sample: () => string; }

export function buildSampler(weights: PoolWeights): Sampler {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) {
    return { sample: () => '' };
  }
  const cdf: Array<[string, number]> = [];
  let acc = 0;
  for (const [letter, w] of entries) {
    acc += w / total;
    cdf.push([letter, acc]);
  }
  return {
    sample: () => {
      const r = Math.random();
      for (const [letter, c] of cdf) {
        if (r < c) return letter === 'Q' ? 'Qu' : letter;
      }
      return cdf[cdf.length - 1][0];
    },
  };
}

// Three-pool generator: draw V vowels, B backbones, O = size² - V - B
// "others", then shuffle so categories aren't clustered in fixed positions.
// If V+B > size² (misconfigured), excess draws are silently dropped.
export function generateBoardFromThreePools(
  size: number,
  vowel: Sampler,
  backbone: Sampler,
  other: Sampler,
  vSize: number,
  bSize: number,
): Board {
  const cells: string[] = [];
  const totalCells = size * size;
  const v = Math.max(0, Math.min(vSize, totalCells));
  const b = Math.max(0, Math.min(bSize, totalCells - v));
  for (let i = 0; i < v; i++) cells.push(vowel.sample());
  for (let i = 0; i < b; i++) cells.push(backbone.sample());
  for (let i = v + b; i < totalCells; i++) cells.push(other.sample());
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const board: Board = [];
  for (let r = 0; r < size; r++) board.push(cells.slice(r * size, (r + 1) * size));
  return board;
}

// Baseline dice generator — same Math.random shuffle/roll as engine/board.ts.
export function generateBaselineDiceBoard(size: number): Board {
  const dice = DICE_BY_SIZE[size];
  const rolled = dice.map(die => die[Math.floor(Math.random() * die.length)]);
  for (let i = rolled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rolled[i], rolled[j]] = [rolled[j], rolled[i]];
  }
  const board: Board = [];
  for (let r = 0; r < size; r++) board.push(rolled.slice(r * size, (r + 1) * size));
  return board;
}

export function generateBoardFromConfig(size: number, config: PoolConfig): Board {
  const v = buildSampler(config.vowel);
  const b = buildSampler(config.backbone);
  const o = buildSampler(config.other);
  const q = config.quotasBySize[size] ?? { V: 0, B: 0, O: size * size };
  return generateBoardFromThreePools(size, v, b, o, q.V, q.B);
}
