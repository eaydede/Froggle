import { describe, expect, it } from 'vitest';
import { getNextTimedRank, getTimedRank, type TimedRankTargets } from './timedRanks.js';

const targets: TimedRankTargets = { modelVersion: 'test', statisticsVersion: 'test', attainablePoints: 200, thresholds: [30, 60, 100, 140, 180] };

describe('timed rank ladder', () => {
  it('has inclusive thresholds and an unranked starting state', () => {
    expect(getTimedRank(29, targets)).toBeNull();
    expect(getTimedRank(30, targets)?.name).toBe('Scribe');
    expect(getTimedRank(179, targets)?.name).toBe('Virtuoso');
    expect(getTimedRank(180, targets)?.name).toBe('Legend 1');
    expect(getTimedRank(1000, targets)?.name).toBe('Legend 21');
  });
  it('returns the actual points needed for the next title', () => {
    expect(getNextTimedRank(30, targets)).toMatchObject({ name: 'Wordsmith', pointsToNext: 30 });
    expect(getNextTimedRank(179, targets)).toMatchObject({ name: 'Legend 1', pointsToNext: 1 });
    expect(getNextTimedRank(180, targets)).toMatchObject({ name: 'Legend 2', points: 220, pointsToNext: 40 });
    expect(getNextTimedRank(219, targets)).toMatchObject({ name: 'Legend 2', pointsToNext: 1 });
    expect(getTimedRank(220, targets)).toMatchObject({ name: 'Legend 2', points: 220, index: 4 });
    expect(getNextTimedRank(1000, targets)).toMatchObject({ name: 'Legend 22', points: 1020, pointsToNext: 20 });
  });
});
