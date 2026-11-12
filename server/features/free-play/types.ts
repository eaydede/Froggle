


// Counts challenge participants whose completions are unseen by the
// originator. A row counts as "unseen" when it isn't the originator's
// own row AND its completion landed after last_viewed_at — falling back
// to the originator's own completion time when the view has never been
// opened. Returned as a Map keyed by challenge_id for cheap O(1) lookups
// from the history endpoint.
export interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  completed_at: Date;
}


export interface ChallengeOwnerRow {
  id: string;
  completed_at: Date;
  last_viewed_at: Date | null;
}


// ─── Session lifecycle ────────────────────────────────────────────────────
//
// Free-play runs as a server-authoritative session mirroring daily timed:
// the row is created on /start with started_at = now() and completed_at
// null, mutated on every word submission, finalized either by /end or by
// the auto-expiry check on read. The DB row is the source of truth so a
// browser refresh resumes the in-progress game from server state instead
// of restarting the local timer.

export interface FreePlaySession {
  id: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  completed_at: Date | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
  board_size: number;
  min_word_length: number;
  challenge_id: string | null;
  seed: number | null;
}


export type FreePlaySubmitOutcome =
  | { valid: true; word: string; score: number; }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired'; };


export interface StartFreePlayOpts {
  userId: string;
  durationSeconds: number;
  boardSize: number;
  minWordLength: number;
  predefinedBoard?: string[][];
  seed?: number;
  challengeId: string | null;
}


export interface StartFreePlayResult {
  session: FreePlaySession;
  // Salted board solution for client-side instant validation. Same role
  // as the salt/wordHashes pair returned by the daily endpoints.
  salt: string;
  wordHashes: string[];
}


export interface RoomChallengeShare {
  challengeId: string;
  seed: number;
  config: { boardSize: number; timeLimit: number; minWordLength: number; };
}