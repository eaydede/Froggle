import type { Generated } from 'kysely';

export interface DailyResultsTable {
  id: Generated<string>;
  user_id: string;
  date: string;
  found_words: string; // JSON string
  board: string; // JSON string
  completed_at: Generated<Date>;
}

export interface Database {
  daily_results: DailyResultsTable;
}
