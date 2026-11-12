


export interface ScoredResult {
  points: number;
  wordCount: number;
  longestWord: string;
}

export interface WordProgress {
  nextWords: string[];
  aggregate: ScoredResult;
}
