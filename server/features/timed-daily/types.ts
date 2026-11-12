

// ─── Session lifecycle ────────────────────────────────────────────────────
//
// Timed daily mode runs as a server-authoritative session: the row is
// created on /start with started_at = now(), every word goes through
// path + dictionary validation against the official board, and the row
// is finalized either by the player or auto-finalized by the server when
// the time limit elapses. The previous one-shot POST /results endpoint
// accepted a client word list with no validation, which let an attacker
// inflate scores arbitrarily — that endpoint no longer exists.

export interface TimedDailySession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  ended_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
}


export type TimedSubmitOutcome =
  | { valid: true; word: string; score: number; }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired'; };