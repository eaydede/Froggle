


export interface TimeIsMoneySession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}


export type TimeIsMoneySubmitOutcome =
  | { valid: true; word: string; score: number; points: number; }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired'; };


// ─── Ranking ────────────────────────────────────────────────────────────────
//
// Points-based, shared with every other mode. "Time survived" is base + points,
// which orders identically to points, so the same ranking serves the
// time-survived headline the results screen shows.

export interface TimeIsMoneyRosterEntry {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  rank: number;
  isYou: boolean;
}


// ─── Compare ──────────────────────────────────────────────────────────────
//
// Side-by-side comparison of two finalized runs. Mirrors the timed and zen
// daily compare shape so the shared ResultsView renders it with the same
// versus hero + aligned word lists. Both players solve the same seeded board.

export type TimeIsMoneyCompareError = 'forbidden' | 'unplayed' | 'opponent-missing';


export interface TimeIsMoneyComparePlayer {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: { word: string; score: number; }[];
}


export interface TimeIsMoneyCompareResult {
  date: string;
  board: string[][];
  me: TimeIsMoneyComparePlayer;
  them: TimeIsMoneyComparePlayer;
}


// ─── Landing status ─────────────────────────────────────────────────────────

export type TimeIsMoneyState = 'unplayed' | 'in-progress' | 'completed';


export interface TimeIsMoneyStatus {
  state: TimeIsMoneyState;
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  // The run's own starting clock, so the card can show the time it bought
  // without assuming today's config. Null when there's no run yet.
  timeLimit: number | null;
}