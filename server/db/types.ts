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

export interface Database {
  daily_results: DailyResultsTable;
}
