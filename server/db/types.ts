import type { Generated } from 'kysely';

export interface DailyResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  found_words: string; // JSON string
  board: string; // JSON string
  completed_at: Generated<Date>;
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
  board_size: number;
  min_word_length: number;
  time_limit: number;
}

export interface DailyRelaxedResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  found_words: Generated<string>;
  board: string;
  started_at: Generated<Date>;
  last_active_at: Generated<Date>;
  ended_at: Date | null;
  ended_by_player: Generated<boolean>;
  points: Generated<number>;
  word_count: Generated<number>;
  longest_word: Generated<string>;
}

export interface Database {
  daily_results: DailyResultsTable;
  daily_relaxed_results: DailyRelaxedResultsTable;
}
