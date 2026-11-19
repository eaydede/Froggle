import { describe, expect, it } from 'vitest';
import { getNextTimedRank, getTimedRank, getTimedRankStarts, getTimedRankRungs, getBoardDifficultyLevel, type TimedRankTargets } from './timedRanks.js';

const targets: TimedRankTargets = { modelVersion: 'test', statisticsVersion: 'test', attainablePoints: 200, thresholds: [29, 59, 89, 119, 149] };

describe('timed rank ladder', () => {
  it('starts at Scribe and changes title on the first point in each next band', () => {
    expect(getTimedRankStarts(targets)).toEqual([0, 30, 60, 90, 120]);
    expect(getTimedRank(0, targets)).toMatchObject({ name: 'Scribe', index: 0, points: 0 });
    for (const [end, current, next] of [
      [29, 'Scribe', 'Wordsmith'], [59, 'Wordsmith', 'Linguist'],
      [89, 'Linguist', 'Virtuoso'], [119, 'Virtuoso', 'Legend 1'],
    ] as const) {
      expect(getTimedRank(end, targets).name).toBe(current);
      expect(getNextTimedRank(end, targets)).toMatchObject({ name: next, pointsToNext: 1 });
      expect(getTimedRank(end + 1, targets).name).toBe(next);
    }
    expect(getTimedRank(45, targets).name).toBe('Wordsmith');
  });

  it('continues equal Legend steps without a rank cap', () => {
    expect(getTimedRank(149, targets)).toMatchObject({ name: 'Legend 1', points: 120 });
    expect(getTimedRank(150, targets)).toMatchObject({ name: 'Legend 2', points: 150 });
    expect(getNextTimedRank(150, targets)).toMatchObject({ name: 'Legend 3', points: 180, pointsToNext: 30 });
    expect(getTimedRank(1000, targets).name).toBe('Legend 30');
    expect(getNextTimedRank(1000, targets)).toMatchObject({ name: 'Legend 31', pointsToNext: 20 });
  });

  it('uses the active color and saved edges for existing uneven ladders', () => {
    const saved = { ...targets, thresholds: [14, 29, 50, 79, 115] };
    expect(getTimedRank(28, saved)).toMatchObject({ name: 'Wordsmith', points: 15 });
    expect(getNextTimedRank(28, saved)).toMatchObject({ name: 'Linguist', points: 30, pointsToNext: 2 });
    expect(getTimedRank(80, saved).name).toBe('Legend 1');
    expect(getTimedRank(116, saved).name).toBe('Legend 2');
  });
});

describe('results rank carousel', () => {
  it('collapses Legend below its entry score and expands one level above Legend players', () => {
    const below = getTimedRankRungs(45, targets);
    expect(below.map(rung => rung.name)).toEqual(['Legend', 'Virtuoso', 'Linguist', 'Wordsmith', 'Scribe']);
    expect(below[0]).toMatchObject({ collapsed: true, points: 120 });
    const legend = getTimedRankRungs(1200, targets);
    expect(legend[0].name).toBe('Legend 38');
    expect(legend[1].name).toBe('Legend 37');
    expect(legend[legend.length - 1]).toMatchObject({ name: 'Scribe', points: 0 });
    expect(legend.filter(rung => rung.points > 1200)).toHaveLength(1);
  });
});

describe('relative board difficulty', () => {
  it('keeps descriptors aligned with the displayed comparison percentile', () => {
    expect(getBoardDifficultyLevel(null)).toBeNull();
    for (const [percentile, name] of [[0, 'Easy'], [19, 'Easy'], [20, 'Fair'], [40, 'Tough'], [58, 'Tough'], [60, 'Hard'], [80, 'Brutal'], [100, 'Brutal']] as const) {
      expect(getBoardDifficultyLevel(percentile)?.name).toBe(name);
    }
  });
});
