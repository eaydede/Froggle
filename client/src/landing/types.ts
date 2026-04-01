export interface DailyPuzzleConfig {
  puzzleNumber: number;
  boardSize: number;
  timer: number;
  minWordLength: number;
}

export interface DailyResults {
  words: number;
  points: number;
  longestWord: string;
}
