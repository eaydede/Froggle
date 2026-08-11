// Time is Money — a daily mode where the clock is the score. Every word you
// find buys seconds, so a good run keeps extending its own deadline and the
// headline result is how long you stayed alive rather than how many points you
// banked.
//
// Shared between server (clock math, expiry) and client (timer, hero stat) so
// the payout rate has exactly one definition.

// Seconds added to the clock per point a found word scores. Bump here to
// retune the payout; the server deadline, the client countdown, and the
// time-survived display all derive from this.
export const TIME_IS_MONEY_SECONDS_PER_POINT = 2;

export const TIME_IS_MONEY_CONFIG = {
  boardSize: 5,
  minWordLength: 3,
  // Starting clock, before any word extends it.
  timeLimit: 60,
} as const;

// The clock a run was worth: the starting time plus everything banked. Base
// and rate are identical for every player, so ordering by this is identical to
// ordering by points — it is purely a display transform.
export function timeSurvivedSeconds(points: number): number {
  return TIME_IS_MONEY_CONFIG.timeLimit + points * TIME_IS_MONEY_SECONDS_PER_POINT;
}
