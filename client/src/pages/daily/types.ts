/**
 * Performance stamp tiers, ordered by precedence (highest wins).
 * null = completed with no special ranking.
 */
export type StampTier = "first" | "second" | "third" | "top30" | null;

export type DailyState = "completed" | "missed" | "unplayed";

/**
 * A single daily puzzle entry for display in the daily page carousel.
 * Built from DailyInfo + the player's result data for that day.
 */
export interface DailyEntry {
  puzzleNumber: number;
  date: Date;
  state: DailyState;
  points?: number;
  wordsFound?: number;
  longestWord?: string;
  longestWordDefinition?: string;
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
  /** 7 booleans representing the last 7 days, true = played */
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
}