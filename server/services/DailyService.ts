import { scoreWord } from 'engine/scoring.js';

export interface ScoredResult {
  points: number;
  wordCount: number;
  longestWord: string;
}

// Computes the aggregates that get persisted alongside a daily_results row.
// Kept pure and trivially testable so the Phase 3 backfill script can reuse it.
// Longest-word tiebreak is alphabetical ascending so the stored value is stable
// regardless of the order words were found in.
export function scoreResult(foundWords: string[]): ScoredResult {
  let points = 0;
  let longestWord = '';
  for (const word of foundWords) {
    points += scoreWord(word);
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points, wordCount: foundWords.length, longestWord };
}
