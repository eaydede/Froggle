import { describe, expect, it } from 'vitest';
import { buildTimeline, formatClock, formatDelta } from './timeline';
import type { ScoredWord } from '../types';

const word = (w: string, score: number, timeSeconds: number | null): ScoredWord => ({
  word: w,
  score,
  path: [],
  timeSeconds,
});

describe('buildTimeline', () => {
  it('reports no data when nothing carries a time', () => {
    const model = buildTimeline([word('CAT', 1, null), word('DOG', 1, null)], 90);
    expect(model.hasData).toBe(false);
    expect(model.marks).toHaveLength(0);
  });

  it('drops untimed words but keeps the timed ones', () => {
    const model = buildTimeline(
      [word('CAT', 1, 5), word('DOG', 1, null), word('BIRD', 2, 10)],
      90,
    );
    expect(model.marks.map((m) => m.word)).toEqual(['CAT', 'BIRD']);
  });

  it('orders marks chronologically and fills per-find deltas', () => {
    const model = buildTimeline(
      [word('BIRD', 2, 12), word('CAT', 1, 4), word('DOG', 1, 7)],
      90,
    );
    expect(model.marks.map((m) => m.word)).toEqual(['CAT', 'DOG', 'BIRD']);
    expect(model.marks[0].deltaSeconds).toBeNull();
    expect(model.marks[1].deltaSeconds).toBe(3);
    expect(model.marks[2].deltaSeconds).toBe(5);
  });

  it('xPct is monotonically non-decreasing along the axis', () => {
    const model = buildTimeline(
      [word('A', 1, 3), word('B', 1, 6), word('C', 1, 40), word('D', 1, 44)],
      90,
    );
    const xs = model.marks.map((m) => m.xPct);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    expect(xs[0]).toBeGreaterThanOrEqual(0);
    expect(xs[xs.length - 1]).toBeLessThanOrEqual(100);
  });

  it('flags a long idle gap as a break relative to the player pace', () => {
    // Brisk ~3s cadence, then a 90s stall before the last word.
    const model = buildTimeline(
      [word('A', 1, 3), word('B', 1, 6), word('C', 1, 9), word('D', 1, 99)],
      120,
    );
    expect(model.breaks).toHaveLength(1);
    expect(model.breaks[0].durationSeconds).toBe(90);
    expect(model.marks[3].breakBefore).toBe(true);
    expect(model.marks[2].breakBefore).toBe(false);
    expect(model.longestLullSeconds).toBe(90);
  });

  it('does not flag steady spacing as a break', () => {
    const model = buildTimeline(
      [word('A', 1, 5), word('B', 1, 10), word('C', 1, 15), word('D', 1, 20)],
      90,
    );
    expect(model.breaks).toHaveLength(0);
    expect(model.marks.every((m) => !m.breakBefore)).toBe(true);
  });

  it('handles a single timed find without dividing by zero', () => {
    const model = buildTimeline([word('SOLO', 3, 30)], 0);
    expect(model.hasData).toBe(true);
    expect(model.marks).toHaveLength(1);
    expect(Number.isFinite(model.marks[0].xPct)).toBe(true);
  });

  it('segments cover the axis and carry real durations for realtime playback', () => {
    const model = buildTimeline(
      [word('A', 1, 3), word('B', 1, 6), word('C', 1, 9), word('D', 1, 99)],
      120,
    );
    // Leading (0→3), three inter-find gaps, trailing (99→120) = 5 segments.
    expect(model.segments).toHaveLength(5);
    // Contiguous and spanning the full 0→1 axis.
    expect(model.segments[0].xStart).toBeCloseTo(0);
    expect(model.segments[model.segments.length - 1].xEnd).toBeCloseTo(1);
    for (let i = 1; i < model.segments.length; i++) {
      expect(model.segments[i].xStart).toBeCloseTo(model.segments[i - 1].xEnd);
    }
    // The break segment is wide in real seconds but compressed on the axis, so
    // realtime playback crawls across it — its x-span is far narrower than its
    // share of real time.
    const breakSeg = model.segments.find((s) => s.seconds === 90)!;
    const axisShare = breakSeg.xEnd - breakSeg.xStart;
    const timeShare = 90 / 120;
    expect(axisShare).toBeLessThan(timeShare);
  });
});

describe('formatClock / formatDelta', () => {
  it('formats mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(75)).toBe('1:15');
  });

  it('formats deltas compactly', () => {
    expect(formatDelta(4)).toBe('+4s');
    expect(formatDelta(80)).toBe('+1:20');
  });
});
