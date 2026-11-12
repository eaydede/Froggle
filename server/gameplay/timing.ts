// Shared expiry math for timed sessions (daily, free-play, gauntlet). One copy
// instead of three near-identical ones, so the rule can't drift between modes.
//
// A non-positive limit never expires — that's free-play's "unlimited" game.
// Otherwise the session is expired once elapsed time exceeds the limit plus the
// mode's grace window (the brief buffer that lets a word fairly played at the
// buzzer still land despite client/server clock skew).

export function isTimedSessionExpired(
  startedAt: Date,
  limitSeconds: number,
  graceSeconds: number,
  now: Date,
): boolean {
  if (limitSeconds <= 0) return false;
  const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  return elapsed > limitSeconds + graceSeconds;
}

// The honest finalize instant: started_at + limit, with no grace. Recording a
// session as ending here (rather than at "now", which can be well past the
// buzzer on a late /end or a delayed read) keeps the stored duration from
// looking longer than the player was actually allowed.
export function timedExpiryInstant(startedAt: Date, limitSeconds: number): Date {
  return new Date(startedAt.getTime() + limitSeconds * 1000);
}
