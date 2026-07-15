import type { Position } from 'models';

export interface ScoredWord {
  word: string;
  path: Position[];
  score: number;
  /** Optional "this word scored extra" label rendered next to the score
   *  in the post-round word list. Used by the gauntlet hot-letter round
   *  to flag words that picked up the multiplier; left blank for modes
   *  that don't have a per-word bonus. */
  bonus?: string | null;
  /** Elapsed play seconds (from game start) at which this word was found.
   *  Drives the results-page timeline. `null`/absent when the game predates
   *  find-time capture or the source has no timing (e.g. an opponent's list
   *  reconstructed for compare mode). */
  timeSeconds?: number | null;
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
