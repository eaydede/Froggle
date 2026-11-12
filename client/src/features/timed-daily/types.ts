import type { WordDefinition } from "../results/hooks/useDefinition";

export type StampTier = "first" | "second" | "third" | "top30" | null;

export type DailyState = "completed" | "missed" | "unplayed";

export interface DailyEntry {
  puzzleNumber: number;
  date: Date;
  /** Canonical ISO `YYYY-MM-DD`. When set, the timeline picker uses it for
   *  selection/keys instead of re-deriving from `date` via toISOString() —
   *  which drifts to the adjacent day for UTC+13/+14/-12 viewers since the
   *  local-noon `date` crosses the UTC boundary. */
  iso?: string;
  state: DailyState;
  points?: number;
  wordsFound?: number;
  longestWord?: string;
  longestWordDefinition?: WordDefinition | null;
  stampTier: StampTier;
  playersCount: number;
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
}

export interface DailyStats {
  currentStreak: number;
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
}