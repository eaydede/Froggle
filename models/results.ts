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
  players: ResultPlayer[];
}
