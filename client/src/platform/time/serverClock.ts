// Timer math that stays correct when the device wall clock is wrong.
//
// A timed session's start instant is stamped on the *server* clock. Measuring
// elapsed time as `Date.now() - serverStart` silently mixes two clocks: if the
// device clock is ahead of real time (e.g. a phone not set to network time),
// the subtraction reports inflated elapsed time and the player loses part of
// their window — the reported "less time than allotted" bug. A device clock
// that runs behind hands out extra time.
//
// The fix samples a `server clock − device clock` offset once, when the payload
// arrives, and rebases the server-stamped start into the device's own clock.
// Every later `Date.now()` read then cancels the device's absolute error, so
// only the (negligible) clock *rate* difference remains. This is the
// single-player analogue of the RTT-probe offset multiplayer already applies to
// its shared schedule.

/** `server clock − device clock`, sampled when a session payload is received. */
export function clockOffsetMs(serverNowMs: number, deviceNowMs: number): number {
  return serverNowMs - deviceNowMs;
}

/**
 * Sample the clock offset against the current device clock, for use at the
 * moment a payload arrives. Returns 0 when the server didn't supply its clock
 * (older payloads), which leaves behaviour identical to reading the raw device
 * clock. The `Date.now()` read is why this can't live in the pure core above.
 */
export function sampleClockOffset(serverNowMs: number | undefined | null): number {
  return typeof serverNowMs === 'number' ? clockOffsetMs(serverNowMs, Date.now()) : 0;
}

/** A server-stamped instant expressed in this device's clock terms. */
export function toDeviceClock(serverInstantMs: number, offsetMs: number): number {
  return serverInstantMs - offsetMs;
}

/**
 * Elapsed ms since a server-stamped start, evaluated on the device clock but
 * immune to the device's absolute clock error via `offsetMs`. Clamped at 0 to
 * match the components' `Math.max(0, …)` guard.
 */
export function deviceElapsedMs(
  serverStartMs: number,
  offsetMs: number,
  deviceNowMs: number,
): number {
  return Math.max(0, deviceNowMs - toDeviceClock(serverStartMs, offsetMs));
}
