import { getNextTimedRank, getTimedRank, getTimedRankStarts } from 'models/timedRanks';
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
  it('uses equal integer bands, with Legend 1 anchored to its historical target', () => {
    const targets = createTargets(200, 300, 0.9, 'test')!;
    expect(targets.thresholds).toEqual([44, 89, 134, 179, 224]);
    expect(targets.attainablePoints).toBe(200);
    // Scribe 0, Wordsmith 45, Linguist 90, Virtuoso 135, Legend 1 180.
    expect(getTimedRankStarts(targets)).toEqual([0, 45, 90, 135, 180]);
    expect(getTimedRank(180, targets).name).toBe('Legend 1');
    expect(getTimedRank(225, targets).name).toBe('Legend 2');
  });

  it('keeps Legend achievable and spaces every further level by the same amount', () => {
    const targets = createTargets(200, 101, 9, 'test')!;
    expect(getTimedRankStarts(targets)).toEqual([0, 25, 50, 75, 100]);
    expect(getNextTimedRank(100, targets)).toMatchObject({ name: 'Legend 2', points: 125 });
    expect(createTargets(10, 5, 0, 'test')?.thresholds).toEqual([0, 1, 2, 3, 4]);
  });

  it('rejects unsupported boards and invalid inputs', () => {
    expect(createTargets(0, 20, 1, 'test')).toBeNull();
    expect(createTargets(10, 4, 1, 'test')).toBeNull();
    expect(createTargets(NaN, 20, 1, 'test')).toBeNull();
    expect(createTargets(10, 20, NaN, 'test')).toBeNull();
  });
});

describe('board difficulty snapshots', () => {
  it('uses point-weighted difficulty and compares strictly below, including ties', () => {
    const targets = createTargets(50, 100, 1, 'test', [0.1, 0.2, 0.5, 0.5, 0.8])!;
    expect(targets.boardDifficulty).toEqual({ value: 0.5, totalPoints: 100, percentile: 40, comparisonBoards: 5 });
    expect(createTargets(50, 100, 1, 'test', [0.1, 0.2, 0.3, 0.4, 0.45])!.boardDifficulty?.percentile).toBe(100);
  });
  it('does not invent a comparison for sparse or absent reference boards', () => {
    expect(createTargets(50, 100, 1, 'test')!.boardDifficulty?.percentile).toBeNull();
    expect(createTargets(50, 100, 1, 'test', [0.1, 0.2, 0.3, 0.4])!.boardDifficulty?.percentile).toBeNull();
  });
});
