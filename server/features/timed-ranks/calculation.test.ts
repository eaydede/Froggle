import { describe, expect, it } from 'vitest';
import { attainablePoints, createDifficultyLookup, createTargets, vocabularyDifficulty } from './calculation.js';

describe('timed word difficulty', () => {
  it('maps Zipf frequency into [0,1] and distinguishes missing coverage', () => {
    expect(vocabularyDifficulty(6)).toBe(0);
    expect(vocabularyDifficulty(4)).toBe(0.5);
    expect(vocabularyDifficulty(2)).toBe(1);
    expect(vocabularyDifficulty(9)).toBe(0);
    expect(vocabularyDifficulty(-1)).toBe(1);
    expect(vocabularyDifficulty(undefined)).toBe(0.5);
  });

  it('pools opportunities rather than averaging word percentages', () => {
    const vocabulary = new Map([['CATS', 4], ['DOGS', 4], ['RATS', 4]]);
    const difficulty = createDifficultyLookup([
      { word: 'DOGS', opportunities: 100, finds: 20, boards: 5 },
      { word: 'RATS', opportunities: 20, finds: 20, boards: 5 },
    ], vocabulary);
    expect(difficulty('CATS').finding).toBeCloseTo(1 - 40 / 120);
  });

  it('shrinks sparse words toward similar words and excludes self from the prior', () => {
    const vocabulary = new Map([['CATS', 4], ['DOGS', 4]]);
    const difficulty = createDifficultyLookup([
      { word: 'CATS', opportunities: 2, finds: 0, boards: 2 },
      { word: 'DOGS', opportunities: 100, finds: 15, boards: 5 },
    ], vocabulary);
    expect(difficulty('CATS').finding).toBeCloseTo(1 - (0.4 * 3 / 22 + 0.6 * 0.15));
    const isolated = createDifficultyLookup([{ word: 'CATS', opportunities: 100, finds: 100, boards: 5 }], vocabulary);
    expect(isolated('CATS').finding).toBeCloseTo(1 - 103 / 120);
  });

  it('gives repeated boards less influence than diverse boards', () => {
    const vocabulary = new Map([['CATS', 4], ['DOGS', 4]]);
    const baseline = { word: 'DOGS', opportunities: 100, finds: 50, boards: 5 };
    const oneBoard = createDifficultyLookup([baseline, { word: 'CATS', opportunities: 100, finds: 0, boards: 1 }], vocabulary);
    const fiveBoards = createDifficultyLookup([baseline, { word: 'CATS', opportunities: 100, finds: 0, boards: 5 }], vocabulary);
    expect(oneBoard('CATS').finding).toBeLessThan(fiveBoards('CATS').finding);
    const hugeSingleBoard = createDifficultyLookup([baseline, { word: 'CATS', opportunities: 100_000, finds: 0, boards: 1 }], vocabulary);
    expect(hugeSingleBoard('CATS').finding).toBeLessThanOrEqual(0.6);
  });

  it('prefers vocabulary peers and broadens bands when the narrow group is sparse', () => {
    const vocabulary = new Map([['CATS', 5.5], ['DOGS', 5.5], ['RATS', 4.5], ['EELS', 2.5]]);
    const difficulty = createDifficultyLookup([
      { word: 'DOGS', opportunities: 2, finds: 2, boards: 1 },
      { word: 'RATS', opportunities: 98, finds: 48, boards: 5 },
      { word: 'EELS', opportunities: 1000, finds: 0, boards: 5 },
    ], vocabulary);
    expect(difficulty('CATS').finding).toBeCloseTo(0.5);
  });

  it('weights attainable points by ease without changing normal scoring', () => {
    const difficulty = createDifficultyLookup([], new Map([['CATS', 6], ['DOGS', 2]]));
    const points = attainablePoints([{ word: 'CATS', points: 2 }, { word: 'DOGS', points: 5 }], difficulty);
    expect(points).toBeCloseTo(2 * (1 - 0.6 * 0.85) + 5 * (1 - (0.4 + 0.6 * 0.85)));
  });
});

describe('timed rank point targets', () => {
  it('rounds up and keeps every title positive, distinct, and achievable', () => {
    const targets = createTargets(200, 300, [0.15, 0.30, 0.5, 0.7, 0.9], 'test')!;
    expect(targets.thresholds).toEqual([30, 60, 100, 140, 180]);
    expect(createTargets(10, 5, [0, 0, 1, 2, 3], 'test')?.thresholds).toEqual([1, 2, 3, 4, 5]);
    expect(createTargets(0, 20, [1, 2, 3, 4, 5], 'test')).toBeNull();
    expect(createTargets(10, 4, [1, 2, 3, 4, 5], 'test')).toBeNull();
  });
});
