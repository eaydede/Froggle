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
  // Free-play row id assigned when the game completed and was persisted.
  // Used by the share button to mint a challenge link. Null for daily
  // results and when the server-side insert hadn't dispatched yet.
  freePlaySessionId?: string | null;
}
