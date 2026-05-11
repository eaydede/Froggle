// Types for the calibration test bench. Mirrors the harness in
// scripts/calibrate-letters.ts but tailored for client-side use.

import type { Board } from 'models';

export type PoolWeights = Record<string, number>;

// Three-pool stratified config. Per board, we draw EXACTLY V vowels and
// EXACTLY B backbones, with the remaining cells filled from the "others"
// pool. Pinning V+B counts is what closes the variance gap with the dice.
export interface PoolConfig {
  vowel: PoolWeights;        // AEIOU
  backbone: PoolWeights;     // T, S, R, N, L, D
  other: PoolWeights;        // everything else (including Y, Qu via Q, J, X, Z)
  // Per-board exact counts. V + B + O must equal size² for each entry.
  quotasBySize: Record<number, { V: number; B: number; O: number }>;
}

export interface ComboKey {
  size: number;
  minLen: number;
}

export interface BoardMetricsResult {
  totals: number[];
  commonCounts: number[];
  longests: number[];
  longSixPlus: number[];
  // bucket -> per-board count
  lenHistBoards: Record<string, number[]>;
  commonLenHistBoards: Record<string, number[]>;
  // suffix -> per-board count of common words ending with that suffix
  suffixBoards: Record<string, number[]>;
  // word -> # boards it appeared on (across all 1000 boards)
  wordBoardCount: Map<string, number>;
}

export interface DiversityRow {
  coverage: number;       // 0..1
  concentration: number;  // 0..1, top-20 share
  distinctSeen: number;
  totalAvailable: number;
}

export interface ComboRun {
  result: BoardMetricsResult;
  diversity: Record<string, DiversityRow>;  // bucket -> row
}

export interface CandidateRun {
  name: string;                                       // 'baseline_dice' or 'current'
  perCombo: Record<string, ComboRun>;                 // key = `${size}x${size}_min${minLen}`
}

export interface CalibrationOutput {
  candidates: CandidateRun[];
  commonByBucket: Record<string, number>;
  combos: ComboKey[];
  nBoards: number;
}

export interface ProgressMessage {
  type: 'progress';
  candidate: string;
  comboKey: string;
  comboIndex: number;     // 0-based across all candidate × combo cells
  comboTotal: number;     // total cells
}

export interface ResultMessage {
  type: 'result';
  output: CalibrationOutput;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ReadyMessage {
  type: 'ready';
  dictSize: number;
  commonSize: number;
}

export type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage | ReadyMessage;

export interface RunRequest {
  type: 'run';
  config: PoolConfig;
  nBoards: number;
}

export type SerializableBoard = Board;
