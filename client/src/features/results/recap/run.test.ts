import { describe, expect, it } from 'vitest';
import { curve, formatTime, mergeRuns, scoreAt, timedFinds, runSegments } from './run';

describe('result runs', () => {
  const you = timedFinds(
    [
      { word: 'CAME', score: 2, time: 8 },
      { word: 'SCALES', score: 5, time: 34 },
    ],
    'you',
  )!;
  it('keeps pre-migration games in find-order mode rather than making up times', () => {
    expect(timedFinds([{ word: 'CAME', score: 2, time: null }], 'you')).toBeNull();
    expect(timedFinds([{ word: 'CAME', score: 2, time: NaN }], 'you')).toBeNull();
    expect(timedFinds([], 'you')).toEqual([]);
  });
  it('merges real finds chronologically, putting you first for tied times', () => {
    const opp = timedFinds(
      [
        { word: 'SCAM', score: 2, time: 8 },
        { word: 'SCAMS', score: 3, time: 12 },
      ],
      'opp',
    )!;
    expect(mergeRuns(you, opp).map((f) => f.key)).toEqual([
      'you:CAME',
      'opp:SCAM',
      'opp:SCAMS',
      'you:SCALES',
    ]);
  });
  it('counts a find exactly at the playhead and builds a step rather than a diagonal', () => {
    expect(scoreAt(you, 7.9)).toBe(0);
    expect(scoreAt(you, 8)).toBe(2);
    expect(scoreAt(you, 120)).toBe(7);
    expect(curve(you, 120, 7, 7)).toBe(`0,52 ${(7 / 120) * 100},52`);
    expect(curve(you, 120, 7, 120)).toContain(
      `${(8 / 120) * 100},52 ${(8 / 120) * 100},${52 - (2 / 7) * 52}`,
    );
    expect(curve([], 120, 1, 120)).toBe('0,52 100,52');
    expect(formatTime(63.9)).toBe('1:03');
  });
  it('switches from a solid run to a flat dotted tail exactly at the actual finish', () => {
    const atFinish = runSegments(you, 120, 7, 60, 60);
    expect(atFinish.afterFinish).toBeNull();
    expect(atFinish.active.endsWith('50,0')).toBe(true);
    const atEnd = runSegments(you, 120, 7, 120, 60);
    expect(atEnd.active).toBe(atFinish.active);
    expect(atEnd.afterFinish).toBe('50,0 100,0');
    expect(runSegments(you, 120, 7, 120, 120).afterFinish).toBeNull();
    expect(runSegments([], 120, 1, 120, 0).afterFinish).toBe('0,52 100,52');
  });
});
