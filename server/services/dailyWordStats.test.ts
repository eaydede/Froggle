import { describe, expect, it, vi } from 'vitest';
import {
  TODAY_TTL_MS,
  getCachedWordPercents,
  type CacheRef,
} from './dailyWordStats.js';

const TODAY = '2026-05-07';
const YESTERDAY = '2026-05-06';
const PERCENTS = { CAPTION: 4, RATE: 92 };

function mkRef(): CacheRef {
  return { value: null };
}

describe('getCachedWordPercents', () => {
  it('caches today\'s result so a second call within TTL skips recompute', async () => {
    const ref = mkRef();
    const aggregate = vi.fn().mockResolvedValue(PERCENTS);
    const first = await getCachedWordPercents(ref, aggregate, TODAY, TODAY, 1_000);
    const second = await getCachedWordPercents(ref, aggregate, TODAY, TODAY, 1_001);
    expect(first).toEqual(PERCENTS);
    expect(second).toEqual(PERCENTS);
    expect(aggregate).toHaveBeenCalledTimes(1);
  });

  it('recomputes after the TTL window expires', async () => {
    const ref = mkRef();
    const aggregate = vi.fn().mockResolvedValue(PERCENTS);
    await getCachedWordPercents(ref, aggregate, TODAY, TODAY, 1_000);
    await getCachedWordPercents(ref, aggregate, TODAY, TODAY, 1_000 + TODAY_TTL_MS + 1);
    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('does not cache historic dates so the slot stays free for today', async () => {
    const ref = mkRef();
    const aggregate = vi.fn().mockResolvedValue(PERCENTS);
    await getCachedWordPercents(ref, aggregate, YESTERDAY, TODAY, 1_000);
    await getCachedWordPercents(ref, aggregate, YESTERDAY, TODAY, 1_001);
    expect(ref.value).toBeNull();
    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('does not serve a stale today entry from a previous day', async () => {
    const ref = mkRef();
    const stale = vi.fn().mockResolvedValue({ STALE: 99 });
    const fresh = vi.fn().mockResolvedValue(PERCENTS);
    // Yesterday's run cached its result while the date was still "today".
    await getCachedWordPercents(ref, stale, YESTERDAY, YESTERDAY, 1_000);
    expect(ref.value?.date).toBe(YESTERDAY);
    // The clock rolled over; the same ref must not return yesterday's
    // cache when the caller asks for today's date.
    const result = await getCachedWordPercents(ref, fresh, TODAY, TODAY, 2_000);
    expect(result).toEqual(PERCENTS);
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
