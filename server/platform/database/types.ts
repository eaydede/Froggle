import type { Generated } from 'kysely';

export interface DailyResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  word_times: Generated<Record<string, number> | null>;
  rank_targets: Generated<string | null>;
  found_words: Generated<string>; // JSON string
  board: string; // JSON string
  completed_at: Generated<Date>;
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  board_size: number;
  min_word_length: number;
  time_limit: number;
  started_at: Generated<Date>;
  ended_at: Date | null;
}

export interface DailyZenResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  word_times: Generated<Record<string, number> | null>;
  found_words: Generated<string>;
  board: string;
  started_at: Generated<Date>;
  last_active_at: Generated<Date>;
  ended_at: Date | null;
  ended_by_player: Generated<boolean>;
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  is_competitive: Generated<boolean>;
  theoretical_max_score: number | null;
  active_seconds: Generated<number>;
}

export interface FreePlaySessionsTable {
  id: Generated<string>;
  user_id: string | null;
  date: string;
  word_times: Generated<Record<string, number> | null>;
  rank_targets: Generated<string | null>;
  found_words: Generated<string>;
  board: string;
  started_at: Generated<Date>;
  completed_at: Date | null;
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  time_limit: number;
  board_size: number;
  min_word_length: number;
  challenge_id: string | null;
  seed: number | null;
  last_viewed_at: Date | null;
}

export interface FeedbackTable {
  id: Generated<string>;
  user_id: string | null;
  message: string;
  created_at: Generated<Date>;
}

export interface DailyGauntletResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  round_index: number;
  round_kind: string;
  board: string; // JSON string
  modifier: string; // JSON string
  word_times: Generated<Record<string, number> | null>;
  rank_targets: Generated<string | null>;
  found_words: Generated<string>; // JSON string
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  board_size: number;
  min_word_length: number;
  time_limit: number;
  started_at: Generated<Date>;
  ended_at: Date | null;
  completed_at: Date | null;
}

export interface DailyTimeIsMoneyResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  board: string; // JSON string
  word_times: Generated<Record<string, number> | null>;
  rank_targets: Generated<string | null>;
  found_words: Generated<string>; // JSON string
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  board_size: number;
  min_word_length: number;
  time_limit: number;
  started_at: Generated<Date>;
  ended_at: Date | null;
  completed_at: Date | null;
}

export interface TimedRankModelsTable {
  version: string;
  source_project_ref: string;
  through_date: string;
  cohorts: string;
  published_at: Generated<Date>;
}

export interface TimedWordStatisticsTable {
  version: string;
  settings_key: string;
  word: string;
  opportunities: number;
  finds: number;
  boards: number;
}

export interface TimedBoardRanksTable {
  board_key: string;
  targets: string | null;
  created_at: Generated<Date>;
}

export interface Database {
  timed_rank_models: TimedRankModelsTable;
  timed_word_statistics: TimedWordStatisticsTable;
  timed_board_ranks: TimedBoardRanksTable;
  daily_results: DailyResultsTable;
  daily_zen_results: DailyZenResultsTable;
  daily_gauntlet_results: DailyGauntletResultsTable;
  daily_time_is_money_results: DailyTimeIsMoneyResultsTable;
  free_play_sessions: FreePlaySessionsTable;
  feedback: FeedbackTable;
}
