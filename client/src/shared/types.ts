import type { Position } from 'models';

export interface ScoredWord {
  word: string;
  path: Position[];
  score: number;
}

export interface GameResults {
  board: string[][];
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
}
