import { describe, expect, it } from 'vitest';
import { appendWordTimes, elapsedSeconds, parseWordTimes } from './wordTiming.js';

const start = new Date('2026-06-15T12:00:00.000Z');
const at = (secondsAfterStart: number) =>
  new Date(start.getTime() + secondsAfterStart * 1000);

describe('elapsedSeconds', () => {
  it('measures whole seconds from start', () => {
    expect(elapsedSeconds(start, at(42))).toBe(42);
  });

  it('rounds to 0.1s', () => {
    expect(elapsedSeconds(start, new Date(start.getTime() + 12_340))).toBe(12.3);
  });

  it('floors at zero when the clock reads before start', () => {
    expect(elapsedSeconds(start, at(-5))).toBe(0);
  });
});

describe('parseWordTimes', () => {
  it('passes a parsed array through (jsonb driver shape)', () => {
    expect(parseWordTimes([1, 2, null])).toEqual([1, 2, null]);
  });

  it('parses a JSON string (raw column shape)', () => {
    expect(parseWordTimes('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('reads null / malformed / non-array as empty', () => {
    expect(parseWordTimes(null)).toEqual([]);
    expect(parseWordTimes('not json')).toEqual([]);
    expect(parseWordTimes('{}')).toEqual([]);
  });
});

describe('appendWordTimes', () => {
  it('appends one offset per found word', () => {
    expect(appendWordTimes([1, 2], 2, 1, 3)).toEqual([1, 2, 3]);
  });

  it('appends several offsets at once (Golden Ticket multi-word submit)', () => {
    expect(appendWordTimes([1], 1, 3, 9)).toEqual([1, 9, 9, 9]);
  });

  it('pads a legacy row (no prior timing) with null so indexes stay aligned', () => {
    // found_words already had 2 words but word_times was empty (row predates
    // the column); the new word must land at index 2, not index 0.
    expect(appendWordTimes([], 2, 1, 7)).toEqual([null, null, 7]);
  });

  it('trims any overshoot beyond the prior word count before appending', () => {
    expect(appendWordTimes([1, 2, 3], 2, 1, 5)).toEqual([1, 2, 5]);
  });
});
