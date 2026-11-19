export type ResultsSource =
  | { mode: 'timed' | 'zen' | 'money'; date: string }
  | { mode: 'gauntlet'; date: string; round: number }
  | { mode: 'freeplay'; sessionId: string }
  | { mode: 'room'; code: string; playerId: string };

export interface ResultFind {
  word: string;
  score: number;
  /** Seconds of play. Null for words recorded before timing was available. */
  time: number | null;
}

export interface ResultPlayer {
  id: string;
  displayName: string;
  isYou: boolean;
  finds: ResultFind[];
  /** Actual elapsed play time, or active play time in Zen. */
  duration: number;
  /** Full time allowance, including earned time in Time is Money; zero if untimed. */
  timeLimit: number;
}

export interface ResultsInsights {
  rankTargets?: import('./timedRanks.js').TimedRankTargets | null;
  players: ResultPlayer[];
}

/** Completed-board word ratings, using the statistics saved with that game. */
export interface ResultsWordDifficulties {
  difficulties: Record<string, number>;
}

/** Descending entry scores consumed by the results carousel, for either rank policy. */
export interface ResultsRankRung {
  id: string;
  name: string;
  colorToken: string;
  ordinal: number;
  points: number;
  nextPoints: number;
  collapsed?: boolean;
}

/** A saved word-statistics version and its board-level comparison. */
export interface BoardWordDifficultyAssessment {
  statisticsVersion: string;
  boardDifficulty: import('./timedRanks.js').BoardDifficulty;
}
