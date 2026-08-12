import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clockOffsetMs,
  deviceElapsedMs,
  sampleClockOffset,
  toDeviceClock,
} from './serverClock';

// All times are epoch ms. "real" is the true wall clock; "server" tracks real
// closely; "device" is the player's phone, which may be skewed by any amount.
const REAL_START = 1_700_000_000_000; // when the server stamped started_at
const DURATION_S = 120;

describe('clockOffsetMs', () => {
  it('is zero when the device agrees with the server', () => {
    expect(clockOffsetMs(REAL_START, REAL_START)).toBe(0);
  });

  it('is positive when the device clock runs behind the server', () => {
    // device is 30s behind → server − device = +30s
    expect(clockOffsetMs(REAL_START, REAL_START - 30_000)).toBe(30_000);
  });

  it('is negative when the device clock runs ahead of the server', () => {
    // device is 90s ahead → server − device = −90s
    expect(clockOffsetMs(REAL_START, REAL_START + 90_000)).toBe(-90_000);
  });
});

describe('deviceElapsedMs — immune to a wrong device clock', () => {
  it('reports ~0 elapsed the instant a session starts, whatever the device clock reads', () => {
    // Fetch happens right at start (real elapsed ≈ 0). The player then ticks a
    // moment later on their own (possibly skewed) clock.
    const skews = [0, +90_000, -60_000, +5 * 60_000];
    for (const skew of skews) {
      const deviceNowAtFetch = REAL_START + skew;
      const offset = clockOffsetMs(REAL_START, deviceNowAtFetch);
      // 200ms of real time passes between fetch and the first tick.
      const deviceNowAtTick = deviceNowAtFetch + 200;
      const elapsed = deviceElapsedMs(REAL_START, offset, deviceNowAtTick);
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(1_000); // essentially just started
    }
  });

  it('THE BUG: a phone 90s fast must NOT start the clock 90s drained', () => {
    // This is the reported failure: device clock 90s ahead of real time.
    const deviceNowAtFetch = REAL_START + 90_000;
    const offset = clockOffsetMs(REAL_START, deviceNowAtFetch);
    const elapsed = deviceElapsedMs(REAL_START, offset, deviceNowAtFetch);
    const remainingS = DURATION_S - elapsed / 1000;
    // Player just started: they should have essentially the full 120s.
    expect(remainingS).toBeGreaterThan(DURATION_S - 1);
  });

  it('resumes at the true elapsed after a refresh, regardless of device skew', () => {
    // Player is genuinely 45s into the round when they refresh. The device is
    // 3 minutes ahead of real time.
    const skew = 3 * 60_000;
    const realNowAtFetch = REAL_START + 45_000;
    const deviceNowAtFetch = realNowAtFetch + skew;
    const offset = clockOffsetMs(realNowAtFetch, deviceNowAtFetch);
    const elapsed = deviceElapsedMs(REAL_START, offset, deviceNowAtFetch);
    expect(elapsed).toBeGreaterThan(44_000);
    expect(elapsed).toBeLessThan(46_000);
  });

  it('advances 1:1 with real time across ticks (device rate is trusted, offset is not)', () => {
    const deviceNowAtFetch = REAL_START + 90_000; // 90s fast phone
    const offset = clockOffsetMs(REAL_START, deviceNowAtFetch);
    const at = (realSinceStart: number) =>
      deviceElapsedMs(REAL_START, offset, deviceNowAtFetch + realSinceStart);
    expect(at(10_000) - at(0)).toBe(10_000);
    expect(at(60_000) - at(0)).toBe(60_000);
  });
});

describe('toDeviceClock', () => {
  it('rebases a server instant by the offset so device-clock math lines up', () => {
    // device 90s ahead → offset −90s → the start reads 90s later on the device.
    const offset = clockOffsetMs(REAL_START, REAL_START + 90_000);
    expect(toDeviceClock(REAL_START, offset)).toBe(REAL_START + 90_000);
  });

  it('is a no-op when clocks agree', () => {
    expect(toDeviceClock(REAL_START, 0)).toBe(REAL_START);
  });
});

describe('sampleClockOffset (impure — reads the device clock)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 0 when the server clock is absent, preserving legacy behaviour', () => {
    expect(sampleClockOffset(undefined)).toBe(0);
    expect(sampleClockOffset(null)).toBe(0);
  });

  it('measures server − device against the live device clock', () => {
    vi.spyOn(Date, 'now').mockReturnValue(REAL_START + 90_000); // phone 90s fast
    expect(sampleClockOffset(REAL_START)).toBe(-90_000);
  });
});

// The regression guard for the reported bug, composed exactly as production
// does: API layer samples the offset, the Game builder rebases startedAt, and
// the timer reads `Date.now() - startedAt`.
describe('end-to-end: a skewed phone still gets its full window', () => {
  afterEach(() => vi.restoreAllMocks());

  it('start payload → rebased startedAt → ~full time remaining on a 90s-fast phone', () => {
    vi.spyOn(Date, 'now').mockReturnValue(REAL_START + 90_000);
    // Freshly started session: server stamped started_at and server_now together.
    const offset = sampleClockOffset(REAL_START); // api layer, at receipt
    const startedAt = toDeviceClock(REAL_START, offset); // Game builder
    // A tick 200ms later, read the same way useTimer/TimerBar do.
    const deviceNowAtTick = REAL_START + 90_000 + 200;
    const remainingS = DURATION_S - Math.max(0, deviceNowAtTick - startedAt) / 1000;
    expect(remainingS).toBeGreaterThan(DURATION_S - 1);
  });

  it('a 2-minute-slow phone does not hand out extra time either', () => {
    vi.spyOn(Date, 'now').mockReturnValue(REAL_START - 120_000);
    const offset = sampleClockOffset(REAL_START);
    const startedAt = toDeviceClock(REAL_START, offset);
    const deviceNowAtTick = REAL_START - 120_000 + 200;
    const remainingS = DURATION_S - Math.max(0, deviceNowAtTick - startedAt) / 1000;
    expect(remainingS).toBeLessThanOrEqual(DURATION_S);
    expect(remainingS).toBeGreaterThan(DURATION_S - 1);
  });
});
