import { describe, expect, it } from 'vitest';
import { getNextZenRank, getZenRank, getZenRankRungs, getZenRankTarget, ZEN_RANKS } from './zenRanks.js';

describe('Zen results ladder', () => {
  it('preserves the original percentages, Unranked start, and finite Legend peak', () => {
    const rungs = getZenRankRungs(100);
    expect(rungs.map(rung => [rung.name, rung.points])).toEqual([
      ['Legend', 28], ['Virtuoso', 22], ['Linguist', 14], ['Wordsmith', 8], ['Scribe', 3], ['Unranked', 0],
    ]);
    for (let score = 0; score <= 100; score++) {
      const current = rungs.find(rung => score >= rung.points)!;
      expect(current.name).toBe(getZenRank(score, 100)?.name ?? 'Unranked');
    }
    expect(getZenRankRungs(0)).toEqual([]);
    expect(getNextZenRank(100, 100)).toBeNull();
  });

  it('rounds targets consistently with the rank earned at the boundary', () => {
    for (const ceiling of [100, 101, 262, 539, 1000]) {
      for (const rank of ZEN_RANKS) {
        const entry = getZenRankTarget(rank, ceiling);
        expect(getZenRank(entry, ceiling)?.name).toBe(rank.name);
        expect(getNextZenRank(entry - 1, ceiling)).toMatchObject({ rank, pointsToNext: 1 });
      }
    }
    // 0.28 * 100 is slightly above 28 in floating-point arithmetic.
    expect(getNextZenRank(27, 100)?.pointsToNext).toBe(1);
  });
});
