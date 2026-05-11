// Grid-search V/B/O quotas per size around the current H8 defaults. For each
// candidate quota, generate N boards and score against baseline_dice on the
// metrics we care about (common-word count + length-6+ count + diversity).
//
// Per-size search: since quotas only affect their own size's metrics, each
// size is tuned independently. Other sizes stay at H8 defaults.
//
// Usage:
//   npm run tune-quotas

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from 'engine/dictionary';
import { generateBoard } from 'engine/board';
import type { Board } from 'models';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const N_BOARDS = 1500;

// Sub-combos to evaluate per size (each size has its own min-length variants).
const SUB_COMBOS: Record<number, number[]> = {
  4: [3, 4],
  5: [3, 4, 5],
  6: [4, 5],
};

// Search grid per size — ±2 around current H8 quotas.
const H8_QUOTAS: Record<number, { V: number; B: number }> = {
  4: { V: 5, B: 6 },
  5: { V: 10, B: 9 },
  6: { V: 14, B: 13 },
};

const SEARCH: Record<number, { V: number[]; B: number[] }> = {
  4: { V: [3, 4, 5, 6, 7],     B: [4, 5, 6, 7, 8] },
  5: { V: [8, 9, 10, 11, 12],  B: [7, 8, 9, 10, 11] },
  6: { V: [12, 13, 14, 15, 16], B: [11, 12, 13, 14, 15] },
};

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

const VOWEL_SET = new Set(['A', 'E', 'I', 'O', 'U']);
const BACKBONE_SET = new Set(['T', 'S', 'R', 'N', 'L', 'D']);

type Weights = Record<string, number>;

function diceFrequencies(dice: string[][]): Weights {
  const counts: Weights = {};
  for (const die of dice) for (const face of die) counts[face] = (counts[face] ?? 0) + 1;
  return counts;
}

function filterWeights(all: Weights, keep: (l: string) => boolean): Weights {
  const out: Weights = {};
  for (const [l, w] of Object.entries(all)) if (keep(l)) out[l] = w;
  return out;
}

function buildSampler(weights: Weights): () => string {
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

function generateBoardFromThreePools(
  size: number, vS: () => string, bS: () => string, oS: () => string, V: number, B: number,
): Board {
  const cells: string[] = [];
  const N = size * size;
  const v = Math.max(0, Math.min(V, N));
  const b = Math.max(0, Math.min(B, N - v));
  for (let i = 0; i < v; i++) cells.push(vS());
  for (let i = 0; i < b; i++) cells.push(bS());
  for (let i = v + b; i < N; i++) cells.push(oS());
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const board: Board = [];
  for (let r = 0; r < size; r++) board.push(cells.slice(r * size, (r + 1) * size));
  return board;
}

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

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
const median = (a: number[]) => quantile(a, 0.5);
const mean = (a: number[]) => a.length === 0 ? 0 : a.reduce((s, x) => s + x, 0) / a.length;

interface ComboMetrics {
  common: number;       // median per board
  long6plus: number;    // median per board
  coverage5: number;    // fraction
  coverage6: number;
  concentration5: number;
  concentration6: number;
}

function lengthBucket(len: number): string {
  if (len <= 3) return '3';
  if (len === 4) return '4';
  if (len === 5) return '5';
  if (len === 6) return '6';
  return '7+';
}

function runBoards(
  size: number,
  minLen: number,
  generator: (size: number) => Board,
  dict: Set<string>,
  prefixes: Set<string>,
  common: Set<string>,
  commonByBucket: Record<string, number>,
  n: number,
): ComboMetrics {
  const commons: number[] = [];
  const long6: number[] = [];
  const wordBoardCount = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const board = generator(size);
    const words = findAllWords(board, dict, prefixes, minLen);
    let cCount = 0, l6 = 0;
    for (const w of words) {
      if (common.has(w)) cCount++;
      if (w.length >= 6) l6++;
      wordBoardCount.set(w, (wordBoardCount.get(w) ?? 0) + 1);
    }
    commons.push(cCount);
    long6.push(l6);
  }
  const div = (bucket: string) => {
    const totalAvail = commonByBucket[bucket] ?? 0;
    const counts: number[] = [];
    for (const [w, c] of wordBoardCount) {
      if (!common.has(w)) continue;
      if (lengthBucket(w.length) !== bucket) continue;
      counts.push(c);
    }
    const distinct = counts.length;
    const total = counts.reduce((s, c) => s + c, 0);
    const coverage = totalAvail > 0 ? distinct / totalAvail : 0;
    counts.sort((a, b) => b - a);
    const top20 = counts.slice(0, 20).reduce((s, c) => s + c, 0);
    const concentration = total > 0 ? top20 / total : 0;
    return { coverage, concentration };
  };
  const d5 = div('5');
  const d6 = div('6');
  return {
    common: median(commons),
    long6plus: median(long6),
    coverage5: d5.coverage,
    coverage6: d6.coverage,
    concentration5: d5.concentration,
    concentration6: d6.concentration,
  };
}

interface QuotaCandidate {
  V: number; B: number; O: number;
  score: number;
  details: Record<string, ComboMetrics & { commonDelta: number; long6Delta: number; covGain: number; concGain: number }>;
}

async function main() {
  console.log('Loading dictionary...');
  const dict = loadDictionary(path.join(REPO_ROOT, 'enable1.txt'));
  console.log(`  ${dict.size} words`);
  const prefixes = buildPrefixSet(dict);
  console.log(`  ${prefixes.size} prefixes built`);

  console.log('Loading MIT 10k...');
  const commonRaw = fs.readFileSync(path.join(REPO_ROOT, 'scripts/data/mit10k.txt'), 'utf-8');
  const common = new Set<string>(commonRaw.split('\n').map(w => w.trim().toLowerCase()).filter(w => w && dict.has(w)));
  console.log(`  ${common.size} common words after intersect`);

  const commonByBucket: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
  for (const w of common) commonByBucket[lengthBucket(w.length)]++;

  // Baseline metrics, once per (size, minLen).
  console.log('\nBaseline metrics:');
  const baseline: Record<string, ComboMetrics> = {};
  for (const sizeStr of ['4', '5', '6']) {
    const size = Number(sizeStr);
    for (const minLen of SUB_COMBOS[size]) {
      const key = `${size}x${size}_min${minLen}`;
      const t0 = Date.now();
      baseline[key] = runBoards(size, minLen, (s) => generateBoard(s), dict, prefixes, common, commonByBucket, N_BOARDS);
      console.log(`  ${key}: common=${baseline[key].common}, long6=${baseline[key].long6plus}, cov5=${baseline[key].coverage5.toFixed(3)} (${Date.now() - t0}ms)`);
    }
  }

  // Per-size search.
  const winners: Record<number, QuotaCandidate> = {};
  for (const sizeStr of ['4', '5', '6']) {
    const size = Number(sizeStr);
    console.log(`\n=== Tuning ${size}×${size} (H8 default V=${H8_QUOTAS[size].V}, B=${H8_QUOTAS[size].B}, O=${size * size - H8_QUOTAS[size].V - H8_QUOTAS[size].B}) ===`);

    const allFreq = diceFrequencies(DICE_BY_SIZE[size]);
    const vowelW = filterWeights(allFreq, l => VOWEL_SET.has(l));
    const backboneW = filterWeights(allFreq, l => BACKBONE_SET.has(l));
    const otherW = filterWeights(allFreq, l => !VOWEL_SET.has(l) && !BACKBONE_SET.has(l));

    const vS = buildSampler(vowelW);
    const bS = buildSampler(backboneW);
    const oS = buildSampler(otherW);

    const all: Array<QuotaCandidate & { qualifies: boolean }> = [];

    // Tolerance for "ties" — sampling noise at N=1500 is ~±2-3 words and
    // ~±0.01 fraction on coverage. Allow that much slop before calling a
    // candidate a regression on any metric.
    const COMMON_TOL = -1;       // allow common down by 1 word
    const LONG6_TOL = -2;        // allow long6 down by 2
    const COV_TOL = -0.01;       // allow coverage down by 1pp
    const CONC_TOL = -0.01;      // allow concentration down by 1pp (concGain = baseline - current, so negative = regression)

    for (const V of SEARCH[size].V) {
      for (const B of SEARCH[size].B) {
        const O = size * size - V - B;
        if (O < 0) continue;
        const gen = (s: number) => generateBoardFromThreePools(s, vS, bS, oS, V, B);

        const details: QuotaCandidate['details'] = {};
        let qualifies = true;
        let composite = 0;
        for (const minLen of SUB_COMBOS[size]) {
          const key = `${size}x${size}_min${minLen}`;
          const m = runBoards(size, minLen, gen, dict, prefixes, common, commonByBucket, N_BOARDS);
          const b = baseline[key];
          const commonDelta = m.common - b.common;
          const long6Delta = m.long6plus - b.long6plus;
          const covGain = ((m.coverage5 - b.coverage5) + (m.coverage6 - b.coverage6)) / 2;
          const concGain = ((b.concentration5 - m.concentration5) + (b.concentration6 - m.concentration6)) / 2;
          if (commonDelta < COMMON_TOL || long6Delta < LONG6_TOL || covGain < COV_TOL || concGain < CONC_TOL) {
            qualifies = false;
          }
          // Composite — once qualifying, prioritize common-word gain, with
          // smaller bonuses for ceiling and diversity.
          composite += commonDelta + 0.3 * long6Delta + 100 * (covGain + concGain);
          details[key] = { ...m, commonDelta, long6Delta, covGain, concGain };
        }
        const tag = `V=${String(V).padStart(2)} B=${String(B).padStart(2)} O=${String(O).padStart(2)}`;
        console.log(`  ${tag}: ${qualifies ? 'OK' : 'reg'} score=${composite.toFixed(1)}`);
        all.push({ V, B, O, score: composite, details, qualifies });
      }
    }

    const qualifying = all.filter(r => r.qualifies);
    qualifying.sort((a, b) => b.score - a.score);
    const h8Default = all.find(r => r.V === H8_QUOTAS[size].V && r.B === H8_QUOTAS[size].B);
    winners[size] = qualifying[0] ?? (h8Default as QuotaCandidate);

    console.log(`\n  ${qualifying.length} of ${all.length} candidates qualify (no metric regression).`);
    console.log(`\nTop qualifying for ${size}×${size}:`);
    for (const r of qualifying.slice(0, 5)) {
      const tag = r.V === H8_QUOTAS[size].V && r.B === H8_QUOTAS[size].B ? ' [H8 default]' : '';
      console.log(`  V=${r.V} B=${r.B} O=${r.O}${tag}: score=${r.score.toFixed(1)}`);
      for (const [key, d] of Object.entries(r.details)) {
        const b = baseline[key];
        console.log(`    ${key}: common ${d.common} vs ${b.common} (Δ${d.commonDelta >= 0 ? '+' : ''}${d.commonDelta}), long6 ${d.long6plus} vs ${b.long6plus} (Δ${d.long6Delta >= 0 ? '+' : ''}${d.long6Delta}), cov ${(d.covGain * 100).toFixed(2)}pp, conc ${(d.concGain * 100).toFixed(2)}pp`);
      }
    }
    if (qualifying.length === 0) {
      console.log(`  (no candidates qualified — H8 default V=${H8_QUOTAS[size].V} B=${H8_QUOTAS[size].B} kept)`);
    }
  }

  console.log('\n\n=== Recommended quotas ===');
  for (const sizeStr of ['4', '5', '6']) {
    const size = Number(sizeStr);
    const w = winners[size];
    console.log(`  ${size}×${size}: V=${w.V}, B=${w.B}, O=${w.O}  (was V=${H8_QUOTAS[size].V}, B=${H8_QUOTAS[size].B}, O=${size * size - H8_QUOTAS[size].V - H8_QUOTAS[size].B})  score=${w.score.toFixed(1)}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
