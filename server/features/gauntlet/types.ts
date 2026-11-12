import type { GauntletEntry, GauntletModifier, GauntletRoundConfig, GauntletRoundKind } from 'models/gauntlet';


export interface GauntletRoundSession {
  date: string;
  roundIndex: number;
  roundKind: GauntletRoundKind;
  board: string[][];
  modifier: GauntletModifier;
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
  foundWords: string[];
  points: number;
  wordCount: number;
  longestWord: string;
  startedAt: Date;
  endedAt: Date | null;
  completedAt: Date | null;
}


export type GauntletSubmitOutcome =
  | { valid: true; word: string; score: number; }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended' | 'expired' | 'not_started' | 'locked'; };


// ─── Ranking ──────────────────────────────────────────────────────────────

export interface RankedRow {
  user_id: string;
  date: string;
  round_index: number;
  points: number;
  word_count: number;
  rank: number;
  completed_at: Date;
}


export interface AggregateEntry {
  userId: string;
  roundRanks: number[];           // length 3
  rankSum: number;
  bestSingleRank: number;
  lastFinishedAt: Date;
  aggregateRank: number;          // global rank by rankSum
}


export interface GauntletStatus {
  entry: GauntletEntry;
  // Index of the round the player should play next, or null if all done.
  nextRoundIndex: number | null;
  // Per-round configs for rounds the player has not yet started — sent
  // so the confirm page can describe the upcoming round before /start
  // creates the row.
  upcomingConfigs: Record<number, GauntletRoundConfig>;
  // Round *kinds* for every round (including locked ones), so the hub
  // can show "Hot letter" / "Rare letters" as titles for not-yet-playable
  // rounds without revealing the specific modifier instance (e.g. which
  // letter is hot — that's the reveal-on-start moment).
  roundKinds: GauntletRoundKind[];
}