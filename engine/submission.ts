import type { Position } from 'models';
import { isValidPath } from './adjacency.js';
import { isValidWord } from './dictionary.js';

export interface SubmissionAggregate {
  points: number;
  wordCount: number;
  longestWord: string;
}

export interface SubmissionContext {
  board: string[][];
  foundWords: string[];
  boardSize: number;
  minWordLength: number;
  dictionary: Set<string>;
  // Both scorers are injected so callers supply the scoring rule (plain vs
  // gauntlet modifier); the engine stays agnostic to which mode it validates
  // for. `scoreWord` is the per-word value shown to the player; `score` builds
  // the aggregate persisted alongside the row.
  scoreWord: (word: string) => number;
  score: (words: string[]) => SubmissionAggregate;
}

export type SubmissionResult =
  | { valid: false; reason: 'invalid' | 'repeat' }
  | {
      valid: true;
      word: string;
      score: number;
      nextWords: string[];
      aggregate: SubmissionAggregate;
    };

// The trust-but-verify core shared by every mode's word submission: validate the
// path, derive the word from the stored board, enforce the length floor,
// dictionary-check it, reject duplicates, then score. Pure — callers own session
// loading, persistence, and any per-mode bookkeeping around this.
export function validateSubmission(
  path: Position[],
  ctx: SubmissionContext,
): SubmissionResult {
  if (!isValidPath(path, ctx.boardSize)) {
    return { valid: false, reason: 'invalid' };
  }

  const word = path
    .map((pos) => ctx.board[pos.row][pos.col])
    .join('')
    .toUpperCase();

  if (word.length < ctx.minWordLength) {
    return { valid: false, reason: 'invalid' };
  }
  if (!isValidWord(ctx.dictionary, word.toLowerCase())) {
    return { valid: false, reason: 'invalid' };
  }
  if (ctx.foundWords.some((w) => w.toUpperCase() === word)) {
    return { valid: false, reason: 'repeat' };
  }

  const nextWords = [...ctx.foundWords, word];
  return {
    valid: true,
    word,
    score: ctx.scoreWord(word),
    nextWords,
    aggregate: ctx.score(nextWords),
  };
}
