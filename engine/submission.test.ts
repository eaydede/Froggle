import { describe, expect, it } from 'vitest';
import type { Position } from 'models';
import { scoreWord } from './scoring.js';
import { validateSubmission, type SubmissionContext } from './submission.js';

// 3x3 fixture board:
//   C A T
//   X O S
//   D O G
const BOARD = [
  ['C', 'A', 'T'],
  ['X', 'O', 'S'],
  ['D', 'O', 'G'],
];
const DICTIONARY = new Set(['cat', 'cats', 'dog']);

const at = (row: number, col: number): Position => ({ row, col });
const CAT = [at(0, 0), at(0, 1), at(0, 2)];
const CATS = [at(0, 0), at(0, 1), at(0, 2), at(1, 2)];

// Sums word count as a sentinel aggregate; lets us assert the injected scorer
// receives nextWords and its result is passed through untouched.
const countingScore = (words: string[]) => ({
  points: words.length,
  wordCount: words.length,
  longestWord: words.reduce((a, b) => (b.length > a.length ? b : a), ''),
});

function ctx(overrides: Partial<SubmissionContext> = {}): SubmissionContext {
  return {
    board: BOARD,
    foundWords: [],
    boardSize: 3,
    minWordLength: 3,
    dictionary: DICTIONARY,
    scoreWord,
    score: countingScore,
    ...overrides,
  };
}

describe('validateSubmission', () => {
  it('accepts a valid word and returns score, nextWords, and the injected aggregate', () => {
    const result = validateSubmission(CATS, ctx());
    expect(result).toEqual({
      valid: true,
      word: 'CATS',
      score: scoreWord('CATS'),
      nextWords: ['CATS'],
      aggregate: { points: 1, wordCount: 1, longestWord: 'CATS' },
    });
  });

  it('appends to existing foundWords for the aggregate', () => {
    const result = validateSubmission(CATS, ctx({ foundWords: ['CAT'] }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.nextWords).toEqual(['CAT', 'CATS']);
      expect(result.aggregate.wordCount).toBe(2);
    }
  });

  it('rejects a non-adjacent path as invalid', () => {
    const result = validateSubmission([at(0, 0), at(2, 2)], ctx());
    expect(result).toEqual({ valid: false, reason: 'invalid' });
  });

  it('rejects a word below the minimum length as invalid', () => {
    const result = validateSubmission(CAT, ctx({ minWordLength: 4 }));
    expect(result).toEqual({ valid: false, reason: 'invalid' });
  });

  it('rejects a path that spells a non-dictionary word as invalid', () => {
    // A(0,1) → O(1,1) → G(2,2): a connected path, but "AOG" is not a word.
    const result = validateSubmission([at(0, 1), at(1, 1), at(2, 2)], ctx());
    expect(result).toEqual({ valid: false, reason: 'invalid' });
  });

  it('rejects a duplicate of an already-found word as repeat', () => {
    const result = validateSubmission(CAT, ctx({ foundWords: ['CAT'] }));
    expect(result).toEqual({ valid: false, reason: 'repeat' });
  });
});
