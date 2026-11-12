import type { WordDefinition } from '../definitions/types.js';
import type { DailyConfig } from '../timed-daily/config.js';



// ─── Stats endpoint ───────────────────────────────────────────────────────

export type DailyState = 'completed' | 'missed' | 'unplayed';


export type StampTier = 'first' | 'second' | 'third' | 'top30' | null;



export interface DailyStatsDay {
  date: string;
  puzzleNumber: number;
  state: DailyState;
  points: number | null;
  wordsFound: number | null;
  longestWord: string | null;
  longestWordDefinition: WordDefinition | null;
  stampTier: StampTier;
  playersCount: number;
  config: DailyConfig;
}



export interface DailyStatsResponse {
  currentStreak: number;
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}



export interface DailyStatsConfig {
  launchDate: string;
  today: string;
  getPuzzleNumber: (date: string) => number;
  windowDays?: number;
  includeDefinitions?: boolean;
}
