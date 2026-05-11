// Metrics aggregation for the calibration test bench. Mirrors the harness in
// scripts/calibrate-letters.ts so numbers are comparable between the two.

import type { Board } from 'models';
import type { BoardMetricsResult, DiversityRow } from './types';
import { findAllWords } from './solver';

export const COMBOS: Array<{ size: number; minLen: number }> = [
  { size: 4, minLen: 3 },
  { size: 4, minLen: 4 },
  { size: 5, minLen: 3 },
  { size: 5, minLen: 4 },
  { size: 5, minLen: 5 },
  { size: 6, minLen: 4 },
  { size: 6, minLen: 5 },
];

export function comboKey(size: number, minLen: number): string {
  return `${size}x${size}_min${minLen}`;
}

export function lengthBucket(len: number): string {
  if (len <= 3) return '3';
  if (len === 4) return '4';
  if (len === 5) return '5';
  if (len === 6) return '6';
  return '7+';
}

// Suffix list for the morphology metric — ordered longest-first so each word
// classifies to its most specific match (WALKERS → -ers, not -er).
export const SUFFIXES = ['tion', 'ers', 'ier', 'est', 'ing', 'ed', 'er', 'ly', 'y'] as const;
export type Suffix = typeof SUFFIXES[number];

export function classifySuffix(word: string): Suffix | null {
  for (const s of SUFFIXES) {
    if (word.length > s.length && word.endsWith(s)) return s;
  }
  return null;
}

function emptySuffixBoards(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const s of SUFFIXES) out[s] = [];
  return out;
}

export function emptyMetricsResult(): BoardMetricsResult {
  return {
    totals: [],
    commonCounts: [],
    longests: [],
    longSixPlus: [],
    lenHistBoards: { '3': [], '4': [], '5': [], '6': [], '7+': [] },
    commonLenHistBoards: { '3': [], '4': [], '5': [], '6': [], '7+': [] },
    suffixBoards: emptySuffixBoards(),
    wordBoardCount: new Map(),
  };
}

export function runOnBoards(
  generator: (size: number) => Board,
  size: number,
  minLen: number,
  dict: Set<string>,
  prefixes: Set<string>,
  common: Set<string>,
  n: number,
): BoardMetricsResult {
  const result = emptyMetricsResult();
  for (let i = 0; i < n; i++) {
    const board = generator(size);
    const words = findAllWords(board, dict, prefixes, minLen);
    const lenHist: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
    const commonLenHist: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
    const suffixHist: Record<string, number> = {};
    for (const s of SUFFIXES) suffixHist[s] = 0;
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
      result.wordBoardCount.set(w, (result.wordBoardCount.get(w) ?? 0) + 1);
    }
    result.totals.push(total);
    result.commonCounts.push(commonCount);
    result.longests.push(longest);
    result.longSixPlus.push(longSixPlus);
    for (const k of Object.keys(lenHist)) {
      result.lenHistBoards[k].push(lenHist[k]);
      result.commonLenHistBoards[k].push(commonLenHist[k]);
    }
    for (const s of SUFFIXES) result.suffixBoards[s].push(suffixHist[s]);
  }
  return result;
}

export function computeDiversity(
  result: BoardMetricsResult,
  common: Set<string>,
  commonByBucket: Record<string, number>,
  bucket: string,
): DiversityRow {
  const totalAvailable = commonByBucket[bucket] ?? 0;
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

export function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
export const median = (a: number[]) => quantile(a, 0.5);
export const p10 = (a: number[]) => quantile(a, 0.10);
export const p90 = (a: number[]) => quantile(a, 0.90);
export const mean = (a: number[]) => a.length === 0 ? 0 : a.reduce((s, x) => s + x, 0) / a.length;
