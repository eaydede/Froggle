// Calibration harness for letter-pool board generation.
//
// Generates N boards per (candidate, size, minLength) combo, runs the solver
// against enable1.txt, and reports volume / length / attainability / diversity
// metrics against the current dice baseline. Writes a markdown report to
// scripts/output/.
//
// Read-only against engine/. Brings its own pool generator and a local solver
// (algorithm identical to engine/solver.ts, but with the prefix set hoisted out
// of the inner loop — ~14k solver calls otherwise rebuild the same 1M-entry
// Set per call).
//
// Usage:
//   npm run calibrate-letters

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from 'engine/dictionary';
import { generateBoard } from 'engine/board';
import type { Board } from 'models';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const N_BOARDS = 1000;
const SAMPLE_BOARDS = 3;
const WARHORSE_THRESHOLD = 0.5;

const COMBOS = [
  { size: 4, minLen: 3 },
  { size: 4, minLen: 4 },
  { size: 5, minLen: 3 },
  { size: 5, minLen: 4 },
  { size: 5, minLen: 5 },
  { size: 6, minLen: 4 },
  { size: 6, minLen: 5 },
];

type PoolWeights = Record<string, number>;

const OPTION_A_SCRABBLE: PoolWeights = {
  E: 12.0, A: 9.0, I: 9.0, O: 8.0, N: 6.0, R: 6.0, T: 6.0,
  L: 4.0, S: 4.0, U: 4.0, D: 4.0, G: 3.0,
  B: 2.0, C: 2.0, M: 2.0, P: 2.0, F: 2.0, H: 2.0, V: 2.0, W: 2.0, Y: 2.0,
  K: 1.0, J: 1.0, X: 1.0, Q: 1.0, Z: 1.0,
};

const OPTION_B_NORVIG: PoolWeights = {
  E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
  D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
  P: 1.9, B: 1.5, V: 1.0,
  K: 0.8, J: 0.15, X: 0.15, Q: 0.10, Z: 0.07,
};

const OPTION_C_HYBRID: PoolWeights = {
  E: 12.4, A: 8.7, I: 7.8, O: 7.7, T: 7.8, N: 6.4, R: 6.0, S: 5.4, H: 4.4, L: 4.0,
  D: 4.2, U: 3.3, C: 2.5, M: 2.2, G: 2.4, W: 2.2, Y: 2.0, F: 2.1, P: 2.0, B: 1.7, V: 1.4,
  K: 0.9,
  J: 0.5, X: 0.5, Q: 0.4, Z: 0.4,
};

interface PoolCandidate { name: string; weights: PoolWeights; }

const POOL_CANDIDATES: PoolCandidate[] = [];

// Local copies of the dice arrays so we can derive shared/vowel pool weights
// without modifying engine/board.ts. Source of truth remains engine/board.ts;
// these are read-only for frequency analysis.
const DICE_BY_SIZE: Record<number, string[][]> = {
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

const VOWELS = new Set(['A','E','I','O','U']);

function diceFrequencies(dice: string[][]): PoolWeights {
  const counts: PoolWeights = {};
  for (const die of dice) for (const face of die) counts[face] = (counts[face] ?? 0) + 1;
  return counts;
}

function vowelOnlyFrequencies(dice: string[][]): PoolWeights {
  const all = diceFrequencies(dice);
  const out: PoolWeights = {};
  for (const [letter, w] of Object.entries(all)) if (VOWELS.has(letter)) out[letter] = w;
  return out;
}

function consonantOnlyFrequencies(dice: string[][]): PoolWeights {
  const all = diceFrequencies(dice);
  const out: PoolWeights = {};
  for (const [letter, w] of Object.entries(all)) if (!VOWELS.has(letter)) out[letter] = w;
  return out;
}

interface PerSizePool {
  vowelWeights: PoolWeights;
  sharedWeights: PoolWeights;
  vSize: number;
}

interface PerSizeCandidate {
  name: string;
  perSize: (size: number) => PerSizePool;
}

// Three-pool stratified candidate: exact counts of vowels, backbones, and
// "others" per board. Backbones = T, S, R, N, L, D (the consonants that
// drive most common-word formation). The third pool runs the IID risk for
// the remaining cells, but those cells are a smaller fraction of the board.
interface ThreePoolPerSize {
  vowelWeights: PoolWeights;
  backboneWeights: PoolWeights;
  otherWeights: PoolWeights;
  vSize: number;
  bSize: number;
}

interface ThreePoolCandidate {
  name: string;
  perSize: (size: number) => ThreePoolPerSize;
}

// Option H — non-IID exact-vowel-count model.
//
// Generation: draw EXACTLY V vowels (V matches baseline's mean vowel count
// per size), then fill remaining cells from a consonant-only pool. The two
// pools are disjoint (no vowels in the shared bag), so per-board vowel count
// has zero variance. That's the variable that was driving most of IID's
// median drop on right-skewed metrics; pinning it eliminates the structural
// gap with the dice.
//
// Still much simpler than dice: one vowel pool, one consonant pool, one V
// table. No per-position constraints, no reject sampling.

// V matches each size's baseline mean vowel count (computed from sum of
// vowel_faces/6 across each size's dice arrays). Rounded up so we slightly
// over-mean the dice — IID variance still applies *within* the consonant pool
// and on which specific vowels appear, so a small over-mean compensates.
const V_H: Record<number, number> = { 4: 5, 5: 10, 6: 14 };

// Norvig consonants + Q=1.5 + J/X/Z floor — used on 4×4 where Norvig's
// distribution outperforms dice-derived (more 3-letter common words land on
// small boards).
const NORVIG_CONSONANTS_FLOORED: PoolWeights = {
  T: 9.1, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
  D: 4.3, L: 4.0, C: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
  P: 1.9, B: 1.5, V: 1.0, K: 0.8,
  J: 0.5, X: 0.5, Q: 1.5, Z: 0.5,
};

const PER_SIZE_CANDIDATES: PerSizeCandidate[] = [
  {
    name: 'optionH_perSize',
    perSize: (size) => ({
      vowelWeights: vowelOnlyFrequencies(DICE_BY_SIZE[size]),
      sharedWeights: size === 4
        ? NORVIG_CONSONANTS_FLOORED
        : consonantOnlyFrequencies(DICE_BY_SIZE[size]),
      vSize: V_H[size],
    }),
  },
];

// Backbone consonants — drive most common-word formation.
const BACKBONE_LETTERS = new Set(['T', 'S', 'R', 'N', 'L', 'D']);

function backboneOnlyFrequencies(dice: string[][]): PoolWeights {
  const all = diceFrequencies(dice);
  const out: PoolWeights = {};
  for (const [letter, w] of Object.entries(all)) if (BACKBONE_LETTERS.has(letter)) out[letter] = w;
  return out;
}

function otherOnlyFrequencies(dice: string[][]): PoolWeights {
  const all = diceFrequencies(dice);
  const out: PoolWeights = {};
  for (const [letter, w] of Object.entries(all)) {
    if (!VOWELS.has(letter) && !BACKBONE_LETTERS.has(letter)) out[letter] = w;
  }
  return out;
}

// Three-pool quotas (V + B + O = size²). Tuned by grid search:
//   4×4: bumped B 6→7 (one more backbone, one less other)
//   5×5: unchanged — H8 default is Pareto-optimal in local search
//   6×6: swapped V 14→13 and B 13→14 (one more backbone, one less vowel)
const QUOTAS: Record<number, { V: number; B: number; O: number }> = {
  4: { V: 5, B: 7, O: 4 },
  5: { V: 10, B: 9, O: 6 },
  6: { V: 13, B: 14, O: 9 },
};

const THREE_POOL_CANDIDATES: ThreePoolCandidate[] = [
  {
    name: 'optionH8_3pool',
    perSize: (size) => ({
      vowelWeights: vowelOnlyFrequencies(DICE_BY_SIZE[size]),
      backboneWeights: backboneOnlyFrequencies(DICE_BY_SIZE[size]),
      otherWeights: otherOnlyFrequencies(DICE_BY_SIZE[size]),
      vSize: QUOTAS[size].V,
      bSize: QUOTAS[size].B,
    }),
  },
];

// Build a sampler from weights. Sampling 'Q' emits 'Qu' so the cell counts as
// two letters when used in a word, matching the existing dice convention.
function buildSampler(weights: PoolWeights): () => string {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const cdf: Array<[string, number]> = [];
  let acc = 0;
  for (const [letter, w] of entries) {
    acc += w / total;
    cdf.push([letter, acc]);
  }
  return () => {
    const r = Math.random();
    for (const [letter, c] of cdf) {
      if (r < c) return letter === 'Q' ? 'Qu' : letter;
    }
    return cdf[cdf.length - 1][0];
  };
}

function generateBoardFromPool(size: number, sampler: () => string): Board {
  const board: Board = [];
  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) row.push(sampler());
    board.push(row);
  }
  return board;
}

// Three-pool generator: draw vSize vowels, bSize backbones, fill rest from
// "others", then shuffle. Pins variance on vowel and backbone counts —
// the two letter classes that drive most common-word formation.
function generateBoardFromThreePools(
  size: number,
  vowelSampler: () => string,
  backboneSampler: () => string,
  otherSampler: () => string,
  vSize: number,
  bSize: number,
): Board {
  const cells: string[] = [];
  for (let i = 0; i < vSize; i++) cells.push(vowelSampler());
  for (let i = 0; i < bSize; i++) cells.push(backboneSampler());
  for (let i = vSize + bSize; i < size * size; i++) cells.push(otherSampler());
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const board: Board = [];
  for (let r = 0; r < size; r++) board.push(cells.slice(r * size, (r + 1) * size));
  return board;
}

// Two-pool generator: draw vSize letters from vowelSampler, the rest from
// sharedSampler, then shuffle so vowels aren't clustered in fixed positions.
function generateBoardFromTwoPools(
  size: number,
  vowelSampler: () => string,
  sharedSampler: () => string,
  vSize: number,
): Board {
  const cells: string[] = [];
  for (let i = 0; i < vSize; i++) cells.push(vowelSampler());
  for (let i = vSize; i < size * size; i++) cells.push(sharedSampler());
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const board: Board = [];
  for (let r = 0; r < size; r++) board.push(cells.slice(r * size, (r + 1) * size));
  return board;
}

// Local solver. Same algorithm as engine/solver.ts but takes a pre-built prefix
// set so 14k calls don't rebuild it 14k times.
function buildPrefixSet(dict: Set<string>): Set<string> {
  const prefixes = new Set<string>();
  for (const word of dict) {
    for (let i = 1; i <= word.length; i++) prefixes.add(word.substring(0, i));
  }
  return prefixes;
}

function findAllWords(board: Board, dict: Set<string>, prefixes: Set<string>, minLen: number): string[] {
  const size = board.length;
  const found = new Set<string>();
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const dfs = (r: number, c: number, word: string) => {
    const next = word + board[r][c].toLowerCase();
    if (!prefixes.has(next)) return;
    if (next.length >= minLen && dict.has(next)) found.add(next);
    visited[r][c] = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) dfs(nr, nc, next);
      }
    }
    visited[r][c] = false;
  };
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dfs(r, c, '');
  return [...found];
}

interface AggregateResult {
  totals: number[];
  commonCounts: number[];
  commonFractions: number[];
  longests: number[];
  longSixPlus: number[];
  lenHistBoards: Record<string, number[]>;       // bucket -> per-board count
  commonLenHistBoards: Record<string, number[]>;
  suffixBoards: Record<string, number[]>;         // suffix -> per-board count of common words
  tierBoards: Record<string, number[]>;           // tier -> per-board count of 4+ letter words at that SUBTLEX tier
  wordBoardCount: Map<string, number>;           // word -> # boards it appeared on
  samples: Array<{ board: Board; total: number; commonCount: number }>;
}

function lengthBucket(len: number): string {
  if (len <= 3) return '3';
  if (len === 4) return '4';
  if (len === 5) return '5';
  if (len === 6) return '6';
  return '7+';
}

// Suffix list — ordered longest-first so each word classifies to its most
// specific match (WALKERS → -ers, not -er).
const SUFFIXES = ['tion', 'ers', 'ier', 'est', 'ing', 'ed', 'er', 'ly', 'y'] as const;

function classifySuffix(word: string): string | null {
  for (const s of SUFFIXES) {
    if (word.length > s.length && word.endsWith(s)) return s;
  }
  return null;
}

// SUBTLEX-US Zipf tiers. 3-letter words excluded from tier counts.
const TIERS = ['easy', 'medium', 'hard', 'impossible'] as const;

function classifyTier(word: string, zipfMap: Map<string, number>): string | null {
  if (word.length <= 3) return null;
  const z = zipfMap.get(word);
  if (z === undefined || z < 2) return 'impossible';
  if (z < 3) return 'hard';
  if (z < 4) return 'medium';
  return 'easy';
}

function runCandidate(
  generator: (size: number) => Board,
  size: number,
  minLen: number,
  dict: Set<string>,
  prefixes: Set<string>,
  common: Set<string>,
  n: number,
  zipfMap?: Map<string, number>,
): AggregateResult {
  const suffixBoards: Record<string, number[]> = {};
  for (const s of SUFFIXES) suffixBoards[s] = [];
  const tierBoards: Record<string, number[]> = {};
  for (const t of TIERS) tierBoards[t] = [];
  const result: AggregateResult = {
    totals: [], commonCounts: [], commonFractions: [], longests: [], longSixPlus: [],
    lenHistBoards: { '3': [], '4': [], '5': [], '6': [], '7+': [] },
    commonLenHistBoards: { '3': [], '4': [], '5': [], '6': [], '7+': [] },
    suffixBoards,
    tierBoards,
    wordBoardCount: new Map(),
    samples: [],
  };
  const sampleIdx = new Set<number>();
  while (sampleIdx.size < SAMPLE_BOARDS) sampleIdx.add(Math.floor(Math.random() * n));

  for (let i = 0; i < n; i++) {
    const board = generator(size);
    const words = findAllWords(board, dict, prefixes, minLen);
    const lenHist: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
    const commonLenHist: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
    const suffixHist: Record<string, number> = {};
    for (const s of SUFFIXES) suffixHist[s] = 0;
    const tierHist: Record<string, number> = {};
    for (const t of TIERS) tierHist[t] = 0;
    let total = 0, commonCount = 0, longest = 0, longSixPlus = 0;
    for (const w of words) {
      total++;
      const len = w.length;
      const bucket = lengthBucket(len);
      lenHist[bucket]++;
      if (len > longest) longest = len;
      if (len >= 6) longSixPlus++;
      if (common.has(w)) {
        commonCount++;
        commonLenHist[bucket]++;
        const suf = classifySuffix(w);
        if (suf) suffixHist[suf]++;
      }
      if (zipfMap) {
        const t = classifyTier(w, zipfMap);
        if (t) tierHist[t]++;
      }
      result.wordBoardCount.set(w, (result.wordBoardCount.get(w) ?? 0) + 1);
    }
    result.totals.push(total);
    result.commonCounts.push(commonCount);
    result.commonFractions.push(total > 0 ? commonCount / total : 0);
    result.longests.push(longest);
    result.longSixPlus.push(longSixPlus);
    for (const k of Object.keys(lenHist)) {
      result.lenHistBoards[k].push(lenHist[k]);
      result.commonLenHistBoards[k].push(commonLenHist[k]);
    }
    for (const s of SUFFIXES) result.suffixBoards[s].push(suffixHist[s]);
    for (const t of TIERS) result.tierBoards[t].push(tierHist[t]);
    if (sampleIdx.has(i)) result.samples.push({ board, total, commonCount });
  }
  return result;
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
const median = (a: number[]) => quantile(a, 0.5);
const p10 = (a: number[]) => quantile(a, 0.10);
const p90 = (a: number[]) => quantile(a, 0.90);
const mean = (a: number[]) => a.length === 0 ? 0 : a.reduce((s, x) => s + x, 0) / a.length;

interface DiversityRow { coverage: number; concentration: number; distinctSeen: number; totalAvailable: number; }

function computeDiversity(
  result: AggregateResult,
  common: Set<string>,
  commonByBucket: Record<string, number>,
  bucket: '4' | '5' | '6' | '7+',
): DiversityRow {
  const totalAvailable = commonByBucket[bucket];
  const counts: number[] = [];
  for (const [w, c] of result.wordBoardCount) {
    if (!common.has(w)) continue;
    if (lengthBucket(w.length) !== bucket) continue;
    counts.push(c);
  }
  const distinctSeen = counts.length;
  const totalAppearances = counts.reduce((s, c) => s + c, 0);
  const coverage = totalAvailable > 0 ? distinctSeen / totalAvailable : 0;
  counts.sort((a, b) => b - a);
  const top20 = counts.slice(0, 20).reduce((s, c) => s + c, 0);
  const concentration = totalAppearances > 0 ? top20 / totalAppearances : 0;
  return { coverage, concentration, distinctSeen, totalAvailable };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtRange(arr: number[]): string {
  return `${median(arr).toFixed(0)} (${p10(arr).toFixed(0)}–${p90(arr).toFixed(0)})`;
}
function boardToString(board: Board): string {
  return board.map(row => row.map(c => c.padEnd(2)).join(' ')).join('\n');
}

interface ComboRun {
  result: AggregateResult;
  diversity: Record<string, DiversityRow>;
}

// Tier data is only populated when SUBTLEX is available. Detect by checking
// whether any tier count is non-zero across the results.
function hasTierData(
  candidateOrder: string[],
  results: Map<string, Map<string, ComboRun>>,
): boolean {
  for (const name of candidateOrder) {
    const ccs = results.get(name);
    if (!ccs) continue;
    for (const cc of ccs.values()) {
      for (const t of TIERS) {
        if (cc.result.tierBoards[t].some(v => v > 0)) return true;
      }
    }
  }
  return false;
}

function writeReport(
  candidateOrder: string[],
  results: Map<string, Map<string, ComboRun>>,
  commonByBucket: Record<string, number>,
  outputPath: string,
) {
  const lines: string[] = [];
  const tierAvailable = hasTierData(candidateOrder, results);
  lines.push('# Letter Pool Calibration Report');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Boards per (candidate, combo): ${N_BOARDS}`);
  lines.push(`- Dictionary: enable1.txt`);
  lines.push(`- Common-words reference: MIT 10k (intersected with enable1)`);
  lines.push(`- Length-bucket totals in MIT 10k ∩ enable1: 4=${commonByBucket['4']}, 5=${commonByBucket['5']}, 6=${commonByBucket['6']}, 7+=${commonByBucket['7+']}`);
  if (!tierAvailable) {
    lines.push('- SUBTLEX tier metric: **not available** (run scripts/preprocess-subtlex.ts to enable)');
  }
  lines.push('');
  lines.push('Format: median (p10–p90) unless otherwise noted.');
  lines.push('');

  for (const combo of COMBOS) {
    const key = `${combo.size}x${combo.size}_min${combo.minLen}`;
    lines.push(`## ${combo.size}×${combo.size}, minLength ${combo.minLen}`);
    lines.push('');

    lines.push('### Volume + ceiling');
    lines.push('');
    lines.push('| Candidate | Total words | Common words | Longest | Length-6+ |');
    lines.push('|---|---|---|---|---|');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const r = cc.result;
      lines.push(`| ${candName} | ${fmtRange(r.totals)} | ${fmtRange(r.commonCounts)} | ${fmtRange(r.longests)} | ${fmtRange(r.longSixPlus)} |`);
    }
    lines.push('');

    lines.push('### Length distribution (median count per board)');
    lines.push('');
    lines.push('| Candidate | All-3 | All-4 | All-5 | All-6 | All-7+ | Common-3 | Common-4 | Common-5 | Common-6 | Common-7+ |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const r = cc.result;
      const all = ['3','4','5','6','7+'].map(b => median(r.lenHistBoards[b]).toFixed(0));
      const com = ['3','4','5','6','7+'].map(b => median(r.commonLenHistBoards[b]).toFixed(0));
      lines.push(`| ${candName} | ${all.join(' | ')} | ${com.join(' | ')} |`);
    }
    lines.push('');

    lines.push('### Diversity (across 500 boards, common words only)');
    lines.push('');
    lines.push('| Candidate | Length | Coverage (distinct/avail) | Top-20 concentration |');
    lines.push('|---|---|---|---|');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      for (const bucket of ['4','5','6','7+'] as const) {
        const d = cc.diversity[bucket];
        lines.push(`| ${candName} | ${bucket} | ${pct(d.coverage)} (${d.distinctSeen}/${d.totalAvailable}) | ${pct(d.concentration)} |`);
      }
    }
    lines.push('');

    if (tierAvailable) {
      lines.push('### SUBTLEX tier counts (median per board, 4+ letter words only)');
      lines.push('');
      lines.push(`| Candidate | ${TIERS.map(t => t).join(' | ')} |`);
      lines.push(`|---|${TIERS.map(() => '---').join('|')}|`);
      for (const candName of candidateOrder) {
        const cc = results.get(candName)?.get(key);
        if (!cc) continue;
        const cells = TIERS.map(t => median(cc.result.tierBoards[t]).toFixed(0));
        lines.push(`| ${candName} | ${cells.join(' | ')} |`);
      }
      lines.push('');
    }

    lines.push('### Suffix counts (mean per board, common words only)');
    lines.push('');
    lines.push(`| Candidate | ${SUFFIXES.map(s => `-${s}`).join(' | ')} |`);
    lines.push(`|---|${SUFFIXES.map(() => '---').join('|')}|`);
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const cells = SUFFIXES.map(s => mean(cc.result.suffixBoards[s]).toFixed(2));
      lines.push(`| ${candName} | ${cells.join(' | ')} |`);
    }
    lines.push('');

    lines.push('### Warhorse words (>50% of boards, top 10)');
    lines.push('');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const threshold = N_BOARDS * WARHORSE_THRESHOLD;
      const warhorses = [...cc.result.wordBoardCount.entries()]
        .filter(([, c]) => c > threshold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const list = warhorses.length
        ? warhorses.map(([w, c]) => `${w} (${(c / N_BOARDS * 100).toFixed(0)}%)`).join(', ')
        : '_none_';
      lines.push(`- **${candName}**: ${list}`);
    }
    lines.push('');

    lines.push('### Sample boards');
    lines.push('');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      lines.push(`<details><summary><strong>${candName}</strong></summary>`);
      lines.push('');
      for (const s of cc.result.samples) {
        lines.push('```');
        lines.push(boardToString(s.board));
        lines.push(`-- total=${s.total}, common=${s.commonCount}`);
        lines.push('```');
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'));
}

const CANDIDATE_COLORS: Record<string, string> = {
  baseline_dice: '#2c5aa0',
  optionH_perSize: '#059669',
  optionH8_3pool: '#dc2626',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function barRow(label: string, candName: string, value: number, p10v: number, p90v: number, scaleMax: number, displayValue: string): string {
  const pct = scaleMax > 0 ? (value / scaleMax) * 100 : 0;
  const lo = scaleMax > 0 ? (p10v / scaleMax) * 100 : 0;
  const hi = scaleMax > 0 ? (p90v / scaleMax) * 100 : 0;
  const color = CANDIDATE_COLORS[candName] ?? '#6b7280';
  return `<div class="row">
    <div class="lbl">${escapeHtml(label)}</div>
    <div class="track">
      <div class="range" style="left:${lo}%;width:${Math.max(0, hi - lo)}%"></div>
      <div class="bar" style="width:${pct}%;background:${color}"></div>
      <span class="val">${escapeHtml(displayValue)}</span>
    </div>
  </div>`;
}

function simpleBarRow(label: string, candName: string, value: number, scaleMax: number, displayValue: string): string {
  const pct = scaleMax > 0 ? (value / scaleMax) * 100 : 0;
  const color = CANDIDATE_COLORS[candName] ?? '#6b7280';
  return `<div class="row">
    <div class="lbl">${escapeHtml(label)}</div>
    <div class="track">
      <div class="bar" style="width:${pct}%;background:${color}"></div>
      <span class="val">${escapeHtml(displayValue)}</span>
    </div>
  </div>`;
}

const LENGTH_COLORS: Record<string, string> = {
  '3': '#cbd5e1',  // gray — shortest, lowest scoring
  '4': '#60a5fa',  // light blue
  '5': '#10b981',  // green
  '6': '#f59e0b',  // amber
  '7+': '#dc2626', // red — longest, highest scoring
};

function stackedLengthRow(label: string, lenMedians: Record<string, number>, scaleMax: number): string {
  const buckets = ['3', '4', '5', '6', '7+'] as const;
  const total = buckets.reduce((s, b) => s + (lenMedians[b] ?? 0), 0);
  const segs = buckets.map(b => {
    const v = lenMedians[b] ?? 0;
    const w = scaleMax > 0 ? (v / scaleMax) * 100 : 0;
    if (w === 0) return '';
    return `<div style="width:${w}%;height:100%;background:${LENGTH_COLORS[b]}" title="length ${b}: ${v}"></div>`;
  }).join('');
  return `<div class="row">
    <div class="lbl">${escapeHtml(label)}</div>
    <div class="track stacked">${segs}<span class="val">${total}</span></div>
  </div>`;
}

function lengthLegend(): string {
  const buckets = ['3', '4', '5', '6', '7+'] as const;
  const items = buckets.map(b => `<div class="item"><div class="swatch" style="background:${LENGTH_COLORS[b]}"></div>length ${b}</div>`).join('');
  return `<div class="legend" style="margin: 0.25rem 0 0.5rem">${items}</div>`;
}

function writeHtmlReport(
  candidateOrder: string[],
  results: Map<string, Map<string, ComboRun>>,
  commonByBucket: Record<string, number>,
  outputPath: string,
) {
  const baselineName = candidateOrder[0];
  const tierAvailable = hasTierData(candidateOrder, results);
  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; line-height: 1.5; }
    h1 { margin-bottom: 0.25rem; }
    h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 0.25rem; margin-top: 2.5rem; }
    h3 { margin-top: 1.5rem; color: #374151; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    table.scorecard { border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
    table.scorecard th, table.scorecard td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: center; }
    table.scorecard th { background: #f9fafb; font-weight: 600; }
    table.scorecard td.cand { text-align: left; font-family: ui-monospace, monospace; font-size: 0.8125rem; }
    .good { background: #d1fae5; color: #065f46; }
    .ok   { background: #fef3c7; color: #92400e; }
    .bad  { background: #fee2e2; color: #991b1b; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; font-size: 0.8125rem; }
    .legend .item { display: flex; align-items: center; gap: 0.4rem; }
    .legend .swatch { width: 14px; height: 14px; border-radius: 2px; }
    .row { display: flex; align-items: center; gap: 0.75rem; margin: 0.25rem 0; font-size: 0.8125rem; }
    .lbl { width: 180px; font-family: ui-monospace, monospace; color: #374151; flex-shrink: 0; }
    .track { flex: 1; position: relative; height: 22px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
    .track.stacked { display: flex; align-items: stretch; }
    .bar { position: absolute; left: 0; top: 0; height: 100%; }
    .range { position: absolute; top: 0; height: 100%; background: rgba(0,0,0,0.06); border-left: 1px solid rgba(0,0,0,0.15); border-right: 1px solid rgba(0,0,0,0.15); }
    .val { position: absolute; right: 0.4rem; top: 0; line-height: 22px; font-size: 0.75rem; color: #1f2937; font-family: ui-monospace, monospace; text-shadow: 0 0 3px rgba(255,255,255,0.9); }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .chart-title { font-size: 0.8125rem; color: #6b7280; margin-bottom: 0.25rem; font-weight: 600; }
    .note { font-size: 0.8125rem; color: #4b5563; margin: 0.25rem 0 0.75rem; line-height: 1.5; }
    .note strong { color: #1f2937; }
    .intro { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem 1.25rem; margin: 1rem 0 2rem; font-size: 0.875rem; }
    .intro h3 { margin-top: 0.75rem; margin-bottom: 0.25rem; font-size: 0.9375rem; color: #111827; }
    .intro h3:first-child { margin-top: 0; }
    .intro p { margin: 0.25rem 0; line-height: 1.55; }
    .intro .what { color: #4b5563; }
    .intro .look { color: #1f2937; font-weight: 500; }
  `;

  const lines: string[] = [];
  lines.push('<!DOCTYPE html>');
  lines.push('<html><head><meta charset="utf-8"><title>Letter Pool Calibration</title>');
  lines.push(`<style>${css}</style></head><body>`);
  lines.push('<h1>Letter Pool Calibration</h1>');
  lines.push(`<div class="meta">Generated ${new Date().toISOString()} · ${N_BOARDS} boards per (candidate, combo) · enable1.txt vs MIT 10k</div>`);

  // Legend
  lines.push('<div class="legend">');
  for (const c of candidateOrder) {
    const color = CANDIDATE_COLORS[c] ?? '#6b7280';
    lines.push(`<div class="item"><div class="swatch" style="background:${color}"></div>${escapeHtml(c)}</div>`);
  }
  lines.push('</div>');

  // How to read
  lines.push(`<div class="intro">
    <h3>The goal</h3>
    <p class="what">Replace the hardcoded Boggle dice with a tunable letter-pool generator that produces boards at least as good as the dice. Each <em>candidate</em> below is a different proposed pool; <strong>baseline_dice</strong> is the current production behavior we're trying to match or beat.</p>

    <h3>What "good" means</h3>
    <p class="what">A good board has enough words to find, enough word-length variety, enough recognizable words (not just obscure dictionary entries), and a satisfying long-word ceiling. The metrics below each measure one of those dimensions.</p>

    <h3>Reading the numbers</h3>
    <p class="what">Each candidate is run on 500 freshly generated boards per board configuration. We report the <strong>median</strong> (the typical board) and where useful the <strong>p10–p90 band</strong> (middle 80% of boards — p10 is the "bad-day" floor, p90 the "lucky-day" ceiling). Tighter band = more consistent, looser band = more boom-or-bust.</p>

    <h3>Metric quick reference</h3>
    <p class="what"><strong>Common words.</strong> Words found that also appear in the MIT 10k most-common-English-words list. <span class="look">The main attainability metric</span> — proxy for "words a real player would actually recognize."</p>
    <p class="what"><strong>Length-6+ count.</strong> Number of 6+ letter words present. <span class="look">The ceiling metric</span> — long words score the most (8–13 pts each) and make a board feel rewarding.</p>
    <p class="what"><strong>Length distribution.</strong> Shape of available word lengths on a typical board. <span class="look">Bar length = volume, segment proportions = shape.</span> A healthy board has a spread; an unhealthy one is dominated by 3-letter words or has no long words.</p>
    <p class="what"><strong>Coverage</strong> + <strong>Concentration</strong>. Two halves of variety. Coverage = fraction of all MIT-10k words at this length that showed up on at least one of the 500 boards (higher is better — wider vocabulary surface). Concentration = % of total common-word appearances coming from just the top 20 most-repeated words (lower is better — flatter distribution). <span class="look">High coverage + low concentration = wide AND even vocabulary across boards.</span> Coverage alone can mislead: a generator might surface 500 distinct words but still pull 90% of gameplay from the same 20.</p>

    <h3>What to look for</h3>
    <p class="what">A candidate is a winner if it <strong>matches or beats baseline on common words and length-6+ count</strong>, <strong>doesn't tank the p10 floor</strong> (no nasty bad-tail boards), and <strong>holds coverage close to baseline</strong>. Regressions on bigger boards (5×5/6×6) at high min-length matter most — that's where the generator has to work hardest.</p>
  </div>`);

  // Scorecard: common-word ratio vs baseline
  lines.push('<h2>Scorecard — common words found, % of baseline</h2>');
  lines.push('<p class="note">Each cell shows one candidate\'s <strong>median common-word count</strong> for one board configuration, as a % of baseline\'s median for that same configuration. <strong>Green ≥ 95%</strong> means the candidate matches the dice (good). <strong>Red &lt; 80%</strong> means a real regression. The fastest way to see which candidates are viable across the whole space.</p>');
  lines.push('<table class="scorecard">');
  lines.push('<thead><tr><th>Candidate</th>');
  for (const combo of COMBOS) {
    lines.push(`<th>${combo.size}×${combo.size}<br>min ${combo.minLen}</th>`);
  }
  lines.push('</tr></thead><tbody>');
  for (const candName of candidateOrder) {
    lines.push('<tr>');
    lines.push(`<td class="cand">${escapeHtml(candName)}</td>`);
    for (const combo of COMBOS) {
      const key = `${combo.size}x${combo.size}_min${combo.minLen}`;
      const cc = results.get(candName)?.get(key);
      const baseCc = results.get(baselineName)?.get(key);
      if (!cc || !baseCc) { lines.push('<td>-</td>'); continue; }
      const v = median(cc.result.commonCounts);
      const b = median(baseCc.result.commonCounts);
      const ratio = b > 0 ? v / b : 0;
      const pctStr = Math.round(ratio * 100) + '%';
      const cls = ratio >= 0.95 ? 'good' : ratio >= 0.80 ? 'ok' : 'bad';
      lines.push(`<td class="${cls}">${pctStr}</td>`);
    }
    lines.push('</tr>');
  }
  lines.push('</tbody></table>');

  // Per-combo charts
  for (const combo of COMBOS) {
    const key = `${combo.size}x${combo.size}_min${combo.minLen}`;
    lines.push(`<h2>${combo.size}×${combo.size}, minLength ${combo.minLen}</h2>`);

    // Compute scale maxima from p90 across candidates so bars are comparable.
    let maxCommon = 0, maxLong6 = 0;
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      maxCommon = Math.max(maxCommon, p90(cc.result.commonCounts));
      maxLong6 = Math.max(maxLong6, p90(cc.result.longSixPlus));
    }

    lines.push('<div class="grid2">');

    // Common words chart
    lines.push('<div><div class="chart-title">Common words found per board (median, p10–p90 shaded)</div>');
    lines.push('<p class="note"><strong>Attainability.</strong> Number of MIT-10k words on a typical board. The bar is the median; the lighter shaded band behind shows where the middle 80% of boards land. <span style="color:#1f2937"><strong>Look for: long bar, narrow band.</strong></span></p>');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const m = median(cc.result.commonCounts), lo = p10(cc.result.commonCounts), hi = p90(cc.result.commonCounts);
      lines.push(barRow(candName, candName, m, lo, hi, maxCommon, `${m.toFixed(0)} (${lo.toFixed(0)}–${hi.toFixed(0)})`));
    }
    lines.push('</div>');

    // Length-6+ chart
    lines.push('<div><div class="chart-title">Length-6+ words per board (median, p10–p90 shaded)</div>');
    lines.push('<p class="note"><strong>Ceiling.</strong> Number of 6+ letter words on a typical board — these score the most points and drive board satisfaction. <span style="color:#1f2937"><strong>Look for: long bar (high ceiling) without losing the floor — a wide p10–p90 band here means inconsistent payoff.</strong></span></p>');
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const m = median(cc.result.longSixPlus), lo = p10(cc.result.longSixPlus), hi = p90(cc.result.longSixPlus);
      lines.push(barRow(candName, candName, m, lo, hi, maxLong6, `${m.toFixed(0)} (${lo.toFixed(0)}–${hi.toFixed(0)})`));
    }
    lines.push('</div>');

    lines.push('</div>'); // grid2

    // Length distribution (stacked) — all words vs common words.
    lines.push('<h3>Length distribution per board (median count by word length)</h3>');
    lines.push('<p class="note"><strong>Word-length spread.</strong> Each row is one candidate\'s typical board, segmented by word length. Bars use absolute scaling, so <span style="color:#1f2937"><strong>longer total bar = more total words; segment proportions show shape.</strong></span> A board dominated by gray (length-3) feels grindy; a healthy board has visible green/amber/red on the right. Common-words column on the right is what matters most — those are the words a player will actually find.</p>');
    lines.push(lengthLegend());

    // Compute scale maxima as the largest total across candidates so columns
    // are absolutely comparable, not normalised per row.
    let maxAllTotal = 0, maxCommonTotal = 0;
    const lenMediansAll = new Map<string, Record<string, number>>();
    const lenMediansCommon = new Map<string, Record<string, number>>();
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      const all: Record<string, number> = {};
      const com: Record<string, number> = {};
      let totalAll = 0, totalCom = 0;
      for (const b of ['3','4','5','6','7+']) {
        all[b] = median(cc.result.lenHistBoards[b]);
        com[b] = median(cc.result.commonLenHistBoards[b]);
        totalAll += all[b];
        totalCom += com[b];
      }
      lenMediansAll.set(candName, all);
      lenMediansCommon.set(candName, com);
      maxAllTotal = Math.max(maxAllTotal, totalAll);
      maxCommonTotal = Math.max(maxCommonTotal, totalCom);
    }

    lines.push('<div class="grid2">');
    lines.push('<div><div class="chart-title">All valid words</div>');
    for (const candName of candidateOrder) {
      const lm = lenMediansAll.get(candName);
      if (!lm) continue;
      lines.push(stackedLengthRow(candName, lm, maxAllTotal));
    }
    lines.push('</div>');
    lines.push('<div><div class="chart-title">Common words (MIT 10k ∩ enable1)</div>');
    for (const candName of candidateOrder) {
      const lm = lenMediansCommon.get(candName);
      if (!lm) continue;
      lines.push(stackedLengthRow(candName, lm, maxCommonTotal));
    }
    lines.push('</div>');
    lines.push('</div>');

    // Coverage by length bucket
    lines.push('<h3>Coverage of MIT-10k common words (% reached at least once across 500 boards)</h3>');
    lines.push('<p class="note"><strong>Variety — breadth.</strong> Of all MIT-10k words at this length, what fraction showed up on at least one of the 500 boards. <span style="color:#1f2937"><strong>Higher = wider vocabulary surface.</strong></span> Low coverage means the generator only ever surfaces a small slice of common words. Length 5 and 6 shown — where variety matters most.</p>');
    lines.push('<div class="grid2">');
    for (const bucket of ['5','6'] as const) {
      lines.push(`<div><div class="chart-title">Length ${bucket} (of ${commonByBucket[bucket]} available)</div>`);
      for (const candName of candidateOrder) {
        const cc = results.get(candName)?.get(key);
        if (!cc) continue;
        const d = cc.diversity[bucket];
        lines.push(simpleBarRow(candName, candName, d.coverage, 1, `${(d.coverage * 100).toFixed(1)}% (${d.distinctSeen}/${d.totalAvailable})`));
      }
      lines.push('</div>');
    }
    lines.push('</div>');

    // Concentration by length bucket
    lines.push('<h3>Top-20 concentration (% of common-word appearances coming from the most frequent 20)</h3>');
    lines.push('<p class="note"><strong>Variety — evenness.</strong> Of every time a common word of this length appeared on a board across all 500 boards, what % came from just the 20 most-repeated words. <span style="color:#1f2937"><strong>Lower is better:</strong> high concentration means a small handful of warhorse words dominate gameplay even if coverage looks broad. Coverage and concentration together: high coverage + low concentration = wide AND even vocabulary.</strong></span></p>');
    // Compute scale max so concentration bars are absolutely comparable.
    let maxConc5 = 0, maxConc6 = 0;
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      maxConc5 = Math.max(maxConc5, cc.diversity['5'].concentration);
      maxConc6 = Math.max(maxConc6, cc.diversity['6'].concentration);
    }
    lines.push('<div class="grid2">');
    for (const bucket of ['5','6'] as const) {
      const scaleMax = bucket === '5' ? maxConc5 : maxConc6;
      lines.push(`<div><div class="chart-title">Length ${bucket} — lower is better</div>`);
      for (const candName of candidateOrder) {
        const cc = results.get(candName)?.get(key);
        if (!cc) continue;
        const d = cc.diversity[bucket];
        lines.push(simpleBarRow(candName, candName, d.concentration, scaleMax, `${(d.concentration * 100).toFixed(1)}%`));
      }
      lines.push('</div>');
    }
    lines.push('</div>');

    // SUBTLEX tier counts per board (4+ letter words only). Only render when
    // SUBTLEX data was loaded — otherwise the section is just zeros.
    if (tierAvailable) {
    lines.push('<h3>SUBTLEX tier counts per board (median, 4+ letters only)</h3>');
    lines.push('<p class="note"><strong>Recognizability buckets.</strong> Each word a board produces gets classified by its SUBTLEX-US Zipf frequency: easy (≥4) / medium (3–4) / hard (2–3) / impossible (&lt;2 or not in SUBTLEX). 3-letter words are excluded — they\'re trivially attainable and shouldn\'t drive tuning. Use this to see how attainability-skewed each candidate is vs how varied.</p>');
    let maxTier = 0;
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      for (const t of TIERS) maxTier = Math.max(maxTier, median(cc.result.tierBoards[t]));
    }
    lines.push('<div class="grid2">');
    for (let col = 0; col < 2; col++) {
      lines.push('<div>');
      const tList = TIERS.slice(col * 2, (col + 1) * 2);
      for (const tier of tList) {
        lines.push(`<div class="chart-title" style="margin-top:0.5rem">${tier}</div>`);
        for (const candName of candidateOrder) {
          const cc = results.get(candName)?.get(key);
          if (!cc) continue;
          const m = median(cc.result.tierBoards[tier]);
          lines.push(simpleBarRow(candName, candName, m, maxTier, m.toFixed(0)));
        }
      }
      lines.push('</div>');
    }
    lines.push('</div>');
    } // end tierAvailable

    // Suffix counts — common words ending with each suffix, median per board.
    lines.push('<h3>Suffix counts per board (common words only, median; longest-match)</h3>');
    lines.push('<p class="note"><strong>Morphology density.</strong> How often each suffix pattern shows up in a typical board\'s common-word solutions. A board with more -ing / -ed / -er endings feels more "wordy" and rewards English speakers who can spot the patterns. Each word counts toward its <em>longest</em> matching suffix (WALKERS → -ers, not -er).</p>');
    let maxSuffix = 0;
    for (const candName of candidateOrder) {
      const cc = results.get(candName)?.get(key);
      if (!cc) continue;
      for (const s of SUFFIXES) maxSuffix = Math.max(maxSuffix, mean(cc.result.suffixBoards[s]));
    }
    lines.push('<div class="grid2">');
    const half = Math.ceil(SUFFIXES.length / 2);
    for (let col = 0; col < 2; col++) {
      lines.push('<div>');
      const sufList = SUFFIXES.slice(col * half, (col + 1) * half);
      for (const suf of sufList) {
        lines.push(`<div class="chart-title" style="margin-top:0.5rem">-${suf}</div>`);
        for (const candName of candidateOrder) {
          const cc = results.get(candName)?.get(key);
          if (!cc) continue;
          const m = mean(cc.result.suffixBoards[suf]);
          lines.push(simpleBarRow(candName, candName, m, maxSuffix, m.toFixed(2)));
        }
      }
      lines.push('</div>');
    }
    lines.push('</div>');
  }

  lines.push('</body></html>');
  fs.writeFileSync(outputPath, lines.join('\n'));
}

async function main() {
  console.log('Loading dictionary (enable1.txt)...');
  const dict = loadDictionary(path.join(REPO_ROOT, 'enable1.txt'));
  console.log(`  ${dict.size} words`);

  console.log('Building prefix set...');
  const t0 = Date.now();
  const prefixes = buildPrefixSet(dict);
  console.log(`  ${prefixes.size} prefixes in ${Date.now() - t0}ms`);

  console.log('Loading MIT 10k common words...');
  const commonRaw = fs.readFileSync(path.join(REPO_ROOT, 'scripts/data/mit10k.txt'), 'utf-8');
  const commonAll = commonRaw.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
  const common = new Set<string>(commonAll.filter(w => dict.has(w)));
  console.log(`  ${commonAll.length} raw, ${common.size} after intersecting enable1`);

  const commonByBucket: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
  for (const w of common) commonByBucket[lengthBucket(w.length)]++;

  // SUBTLEX is optional — only required for the tier metric. If the file
  // isn't present (e.g. fresh clone without re-running preprocess-subtlex.ts),
  // skip the tier metric instead of crashing. See scripts/data/README.md
  // for regeneration instructions.
  const subtlexPath = path.join(REPO_ROOT, 'scripts/data/subtlex.tsv');
  let zipfMap: Map<string, number> | undefined;
  if (fs.existsSync(subtlexPath)) {
    console.log('Loading SUBTLEX-US Zipf scores...');
    const subtlexRaw = fs.readFileSync(subtlexPath, 'utf-8');
    zipfMap = new Map<string, number>();
    for (const line of subtlexRaw.split('\n')) {
      if (!line) continue;
      const tab = line.indexOf('\t');
      if (tab < 0) continue;
      const w = line.slice(0, tab);
      const z = parseFloat(line.slice(tab + 1));
      if (Number.isFinite(z)) zipfMap.set(w, z);
    }
    console.log(`  ${zipfMap.size} SUBTLEX words (intersected with enable1)`);
  } else {
    console.log('SUBTLEX file not found — tier metric will be skipped.');
    console.log('  (regenerate via scripts/preprocess-subtlex.ts; see scripts/data/README.md)');
  }

  const candidates: Array<{ name: string; generator: (size: number) => Board }> = [
    { name: 'baseline_dice', generator: (size) => generateBoard(size) },
    ...POOL_CANDIDATES.map(c => {
      const sampler = buildSampler(c.weights);
      return { name: c.name, generator: (size: number) => generateBoardFromPool(size, sampler) };
    }),
    ...PER_SIZE_CANDIDATES.map(c => {
      // Pre-build samplers per size so we don't rebuild CDFs per board.
      const cache = new Map<number, { vs: () => string; ss: () => string; v: number }>();
      const getForSize = (size: number) => {
        let entry = cache.get(size);
        if (!entry) {
          const ps = c.perSize(size);
          entry = { vs: buildSampler(ps.vowelWeights), ss: buildSampler(ps.sharedWeights), v: ps.vSize };
          cache.set(size, entry);
        }
        return entry;
      };
      return {
        name: c.name,
        generator: (size: number) => {
          const e = getForSize(size);
          return generateBoardFromTwoPools(size, e.vs, e.ss, e.v);
        },
      };
    }),
    ...THREE_POOL_CANDIDATES.map(c => {
      const cache = new Map<number, { vs: () => string; bs: () => string; os: () => string; v: number; b: number }>();
      const getForSize = (size: number) => {
        let entry = cache.get(size);
        if (!entry) {
          const ps = c.perSize(size);
          entry = {
            vs: buildSampler(ps.vowelWeights),
            bs: buildSampler(ps.backboneWeights),
            os: buildSampler(ps.otherWeights),
            v: ps.vSize,
            b: ps.bSize,
          };
          cache.set(size, entry);
        }
        return entry;
      };
      return {
        name: c.name,
        generator: (size: number) => {
          const e = getForSize(size);
          return generateBoardFromThreePools(size, e.vs, e.bs, e.os, e.v, e.b);
        },
      };
    }),
  ];

  const results = new Map<string, Map<string, ComboRun>>();
  for (const cand of candidates) {
    console.log(`\nCandidate: ${cand.name}`);
    const perCombo = new Map<string, ComboRun>();
    for (const combo of COMBOS) {
      const key = `${combo.size}x${combo.size}_min${combo.minLen}`;
      const t1 = Date.now();
      const result = runCandidate(cand.generator, combo.size, combo.minLen, dict, prefixes, common, N_BOARDS, zipfMap);
      const diversity: Record<string, DiversityRow> = {};
      for (const bucket of ['4','5','6','7+'] as const) {
        diversity[bucket] = computeDiversity(result, common, commonByBucket, bucket);
      }
      perCombo.set(key, { result, diversity });
      const dt = Date.now() - t1;
      console.log(`  ${key}: ${dt}ms (median total=${median(result.totals)}, common=${median(result.commonCounts)})`);
    }
    results.set(cand.name, perCombo);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const mdPath = path.join(REPO_ROOT, `scripts/output/calibration-${ts}.md`);
  const htmlPath = path.join(REPO_ROOT, `scripts/output/calibration-${ts}.html`);
  writeReport(candidates.map(c => c.name), results, commonByBucket, mdPath);
  writeHtmlReport(candidates.map(c => c.name), results, commonByBucket, htmlPath);
  console.log(`\nMarkdown:  ${mdPath}`);
  console.log(`HTML:      ${htmlPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
