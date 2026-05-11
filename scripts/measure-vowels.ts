// One-shot diagnostic: how many vowels does the dice baseline put on a board,
// vs the H8 tuned V quota? Computes both the analytical expected mean (sum of
// vowel_faces/6 across dice) and the empirical distribution from sampled
// rolls. AEIOU only — Y is treated as a consonant in H8's pool model.

import { generateBoard } from 'engine/board';
import type { Board } from 'models';

const N_BOARDS = 10000;

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

const AEIOU = new Set(['A','E','I','O','U']);
const Y_INCLUDED = new Set(['A','E','I','O','U','Y']);

const H8_V: Record<number, number> = { 4: 5, 5: 10, 6: 13 };

function analyticalStats(dice: string[][], vowelSet: Set<string>): { mean: number; variance: number; min: number; max: number } {
  let mean = 0, variance = 0, min = 0, max = 0;
  for (const die of dice) {
    let vowelFaces = 0;
    for (const face of die) if (vowelSet.has(face)) vowelFaces++;
    const p = vowelFaces / die.length;
    mean += p;
    variance += p * (1 - p);
    if (vowelFaces === die.length) min += 1;       // this die always contributes a vowel
    if (vowelFaces > 0) max += 1;                  // this die can contribute a vowel
  }
  return { mean, variance, min, max };
}

function quantile(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

function empirical(size: number, vowelSet: Set<string>): { median: number; p10: number; p90: number; min: number; max: number; mean: number } {
  const counts: number[] = [];
  for (let i = 0; i < N_BOARDS; i++) {
    const board: Board = generateBoard(size);
    let v = 0;
    for (const row of board) for (const cell of row) if (vowelSet.has(cell)) v++;
    counts.push(v);
  }
  const sum = counts.reduce((s, x) => s + x, 0);
  return {
    median: quantile(counts, 0.5),
    p10: quantile(counts, 0.10),
    p90: quantile(counts, 0.90),
    min: Math.min(...counts),
    max: Math.max(...counts),
    mean: sum / counts.length,
  };
}

console.log(`Sampling baseline_dice across ${N_BOARDS.toLocaleString()} boards per size.`);
console.log('');
console.log('Vowel count per board (AEIOU only):');
console.log('');
console.log('| Size | H8 V | Dice expected (analytical) | Dice σ | Dice median (sampled) | Dice p10–p90 | Dice min–max |');
console.log('|---|---|---|---|---|---|---|');
for (const size of [4, 5, 6]) {
  const a = analyticalStats(DICE_BY_SIZE[size], AEIOU);
  const e = empirical(size, AEIOU);
  const stddev = Math.sqrt(a.variance);
  console.log(`| ${size}×${size} | **${H8_V[size]}** | ${a.mean.toFixed(2)} | ±${stddev.toFixed(2)} | ${e.median} | ${e.p10}–${e.p90} | ${e.min}–${e.max} |`);
}

console.log('');
console.log('Vowel count per board (AEIOU + Y):');
console.log('');
console.log('| Size | H8 V (AEIOU only) | Dice expected | Dice σ | Dice median | Dice p10–p90 |');
console.log('|---|---|---|---|---|---|');
for (const size of [4, 5, 6]) {
  const a = analyticalStats(DICE_BY_SIZE[size], Y_INCLUDED);
  const e = empirical(size, Y_INCLUDED);
  const stddev = Math.sqrt(a.variance);
  console.log(`| ${size}×${size} | ${H8_V[size]} | ${a.mean.toFixed(2)} | ±${stddev.toFixed(2)} | ${e.median} | ${e.p10}–${e.p90} |`);
}
