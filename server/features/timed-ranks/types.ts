import type { GauntletModifier } from 'models/gauntlet';

export type TimedRankMode = 'zen' | 'timed' | 'money' | 'freeplay' | 'gauntlet-regular' | 'gauntlet-hotLetter' | 'gauntlet-rareLetters';

export interface RankSettings {
  mode: TimedRankMode;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

export interface HistoricalGame {
  id: string;
  date: string;
  board: string[][];
  settings: RankSettings;
  foundWords: string[];
  modifier?: GauntletModifier;
}

export interface WordStats {
  word: string;
  opportunities: number;
  finds: number;
  boards: number;
}

export interface SolvedGame extends HistoricalGame {
  boardKey: string;
  words: Array<{ word: string; points: number; }>;
  points: number;
}

export interface RankCohort {
  settings: RankSettings;
  words: WordStats[];
  games: number;
  boards: number;
  multipliers: number[] | null;
  /** One board-out difficulty per distinct layout/scoring variant, sorted ascending. */
  boardDifficulties?: number[];
  calibration: {
    fromDate: string;
    throughDate: string;
    games: number;
    boards: number;
    /** Null means recent history was insufficient and all history was used. */
    windowDays: number | null;
  } | null;
}

/** Published metadata is loaded separately from the potentially large word table. */
export interface PublishedRankModel {
  version: string;
  throughDate: string;
  cohorts: Record<string, Omit<RankCohort, 'words'>>;
}

export interface RankModel extends PublishedRankModel {
  cohorts: Record<string, RankCohort>;
}

export function settingsKey(settings: RankSettings): string {
  return [settings.mode, settings.boardSize, settings.timeLimit, settings.minWordLength].join(':');
}
