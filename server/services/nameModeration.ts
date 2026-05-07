import { containsProfanity } from './profanity.js';
import { getMaskedName } from './maskedName.js';

export const STRIKE_LOCKOUT_THRESHOLD = 3;
export const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000;
export const MARK_EMOJI = '🤡';

export interface NameModerationState {
  strikes: number;
  lockedUntilMs: number | null;
}

export function isLocked(state: NameModerationState, nowMs: number): boolean {
  return state.lockedUntilMs !== null && state.lockedUntilMs > nowMs;
}

/**
 * Render a stored display name for public consumption. Locked users get the
 * 🤡 mark; profane names are silently swapped for a deterministic mask;
 * everyone else renders verbatim. The lockout branch wins so an unexpected
 * profane-stored-name on a locked account still shows the clown.
 */
export function renderPublicName(
  userId: string,
  displayName: string,
  state: NameModerationState,
  nowMs: number,
): string {
  if (isLocked(state, nowMs)) return `${displayName} ${MARK_EMOJI}`;
  if (containsProfanity(displayName)) return getMaskedName(userId);
  return displayName;
}

export interface NameUpdate {
  nextDisplayName: string;
  nextState: NameModerationState;
}

/**
 * State transition for a name-change submission. Clean names reset strikes;
 * profane names increment them; the third profane attempt overwrites the
 * stored name with today's masked name and starts a 24h editing lockout.
 * Strikes reset on lockout so the user emerges with a clean slate.
 */
export function computeNameUpdate(
  userId: string,
  submittedName: string,
  state: NameModerationState,
  nowMs: number,
): NameUpdate {
  if (!containsProfanity(submittedName)) {
    return {
      nextDisplayName: submittedName,
      nextState: { strikes: 0, lockedUntilMs: null },
    };
  }
  const escalatedStrikes = state.strikes + 1;
  if (escalatedStrikes >= STRIKE_LOCKOUT_THRESHOLD) {
    return {
      nextDisplayName: getMaskedName(userId),
      nextState: { strikes: 0, lockedUntilMs: nowMs + LOCKOUT_DURATION_MS },
    };
  }
  return {
    nextDisplayName: submittedName,
    nextState: { strikes: escalatedStrikes, lockedUntilMs: null },
  };
}
