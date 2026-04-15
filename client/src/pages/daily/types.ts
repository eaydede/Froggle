import type { WordDefinition } from "../results/hooks/useDefinition";

export type StampTier = "first" | "second" | "third" | "top30" | null;

export type DailyState = "completed" | "missed" | "unplayed";

export interface DailyEntry {
  puzzleNumber: number;
  date: Date;
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