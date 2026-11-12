import type { DailyStatsDay } from '../daily-history/types.js';


export interface ZenSession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: Date;
  last_active_at: Date;
  ended_at: Date | null;
  ended_by_player: boolean;
  points: number;
  word_count: number;
  longest_word: string;
  is_competitive: boolean;
  /** Sum of scoreWord() across every findable word on the board. Locked at
   *  session start so resumes never see a different ceiling. Null only on
   *  pre-rank rows that predate the column. */
  theoretical_max_score: number | null;
  active_seconds: number;
}


export type SubmitOutcome =
  | { valid: true; word: string; score: number; }
  | { valid: false; reason: 'invalid' | 'repeat' | 'ended'; };


export interface DailyZenStatsResponse {
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}


export interface ZenLeaderboardRanking {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  longestWord: string;
}


export interface ZenLeaderboardInProgressEntry {
  userId: string;
  displayName: string;
  isCompetitive: boolean;
}


export interface ZenLeaderboardCurrentPlayer {
  isCompetitive: boolean;
  ranked: boolean;
  /** True once the player has finalized their session (regardless of mode).
   *  The compare feature gates on this — casual finishers can compare too. */
  completed: boolean;
  rank: number | null;
  points: number;
  wordsFound: number;
  longestWord: string;
  totalRankedPlayers: number;
}


export interface ZenLeaderboardResult {
  puzzleNumber: number;
  totalPlayers: number;
  inProgressCount: number;
  avgScore: number;
  rankings: {
    points: ZenLeaderboardRanking[];
    words: ZenLeaderboardRanking[];
  };
  inProgressPlayers: ZenLeaderboardInProgressEntry[];
  currentPlayer: ZenLeaderboardCurrentPlayer | null;
}


export type ZenCompareError = 'unplayed' | 'opponent-missing' | 'forbidden';


export interface ZenComparePlayer {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: { word: string; score: number; }[];
}


export interface ZenCompareResult {
  date: string;
  puzzleNumber: number;
  board: string[][];
  me: ZenComparePlayer;
  them: ZenComparePlayer;
  config: { boardSize: number; minWordLength: number; timeLimit: number; };
}