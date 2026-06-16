import { describe, expect, it } from 'vitest';
import { isTimedSessionExpired, timedExpiryInstant } from './sessionTiming.js';

const start = new Date('2026-06-15T12:00:00.000Z');
const at = (secondsAfterStart: number) =>
  new Date(start.getTime() + secondsAfterStart * 1000);

describe('isTimedSessionExpired', () => {
  it('never expires when the limit is non-positive (unlimited game)', () => {
    expect(isTimedSessionExpired(start, 0, 2, at(10_000))).toBe(false);
    expect(isTimedSessionExpired(start, -1, 2, at(10_000))).toBe(false);
  });

  it('is not expired within the limit', () => {
    expect(isTimedSessionExpired(start, 120, 2, at(100))).toBe(false);
  });

  it('is not expired during the grace window just past the limit', () => {
    expect(isTimedSessionExpired(start, 120, 2, at(121))).toBe(false);
    expect(isTimedSessionExpired(start, 120, 2, at(122))).toBe(false); // limit+grace exactly
  });

  it('is expired once elapsed exceeds limit + grace', () => {
    expect(isTimedSessionExpired(start, 120, 2, at(123))).toBe(true);
  });
});

describe('timedExpiryInstant', () => {
  it('caps at started_at + limit (no grace)', () => {
    expect(timedExpiryInstant(start, 120).toISOString()).toBe('2026-06-15T12:02:00.000Z');
  });
});
