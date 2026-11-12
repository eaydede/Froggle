import { scoreWord } from 'engine/scoring.js';
import type { ScoredResult } from './types.js';


// Sums the per-word scores of a word list. Callers that only need the point
// total share this helper instead of reimplementing the reduce inline.
export function scoreWords(foundWords: string[]): number {
  let points = 0;
  for (const word of foundWords) points += scoreWord(word);
  return points;
}


// Computes the aggregates that get persisted alongside a daily_results row.
// Longest-word tiebreak is alphabetical ascending so the stored value is stable
// regardless of the order words were found in.
export function scoreResult(foundWords: string[]): ScoredResult {
  let longestWord = '';
  for (const word of foundWords) {
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points: scoreWords(foundWords), wordCount: foundWords.length, longestWord };
}
