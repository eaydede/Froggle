import { describe, expect, it } from 'vitest';
import { computeStreak } from './DailyService.js';

const LAUNCH = '2026-01-01';

// Helper: build a Set of the N calendar dates ending at `end` (inclusive),
// i.e. an unbroken run of played days.
function consecutiveEndingAt(end: string, count: number): Set<string> {
  const dates = new Set<string>();
  let cursor = end;
  for (let i = 0; i < count; i++) {
    dates.add(cursor);
    cursor = addDays(cursor, -1);
  }
  return dates;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('computeStreak', () => {
  it('counts a played-today streak including today', () => {
    const today = '2026-05-30';
    const played = consecutiveEndingAt(today, 5);
    expect(computeStreak(played, today, LAUNCH)).toBe(5);
  });

  it('does not break the streak when today has not been played yet', () => {
    const today = '2026-05-30';
    // 5-day run ending yesterday; today absent.
    const played = consecutiveEndingAt(addDays(today, -1), 5);
    expect(computeStreak(played, today, LAUNCH)).toBe(5);
  });

  // Regression guard: the streak must NOT be clamped to the 30-day history
  // window. Before the fix it walked a 30-entry array and capped at 29/30.
  it('counts streaks longer than the 30-day history window', () => {
    const today = '2026-05-30';
    const played = consecutiveEndingAt(today, 45);
    expect(computeStreak(played, today, LAUNCH)).toBe(45);
  });

  it('counts a 100-day streak without capping', () => {
    const today = '2026-05-30';
    const played = consecutiveEndingAt(today, 100);
    expect(computeStreak(played, today, LAUNCH)).toBe(100);
  });

  it('stops at the first prior gap', () => {
    const today = '2026-05-30';
    // Played today and the two days before, then a gap.
    const played = new Set([
      '2026-05-30',
      '2026-05-29',
      '2026-05-28',
      // gap on 2026-05-27
      '2026-05-26',
      '2026-05-25',
    ]);
    expect(computeStreak(played, today, LAUNCH)).toBe(3);
  });

  it('returns 0 when neither today nor yesterday was played', () => {
    const today = '2026-05-30';
    const played = consecutiveEndingAt(addDays(today, -2), 5);
    expect(computeStreak(played, today, LAUNCH)).toBe(0);
  });

  it('returns 0 for an empty play history', () => {
    expect(computeStreak(new Set(), '2026-05-30', LAUNCH)).toBe(0);
  });

  it('never walks past launchDate even if earlier dates are present', () => {
    const today = '2026-01-03';
    // Played every day including two days before launch, which should be
    // ignored — the streak is bounded at launchDate.
    const played = new Set([
      '2026-01-03',
      '2026-01-02',
      '2026-01-01', // launch
      '2025-12-31',
      '2025-12-30',
    ]);
    expect(computeStreak(played, today, LAUNCH)).toBe(3);
  });
});
