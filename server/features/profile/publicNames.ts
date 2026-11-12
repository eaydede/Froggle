import { renderPublicName } from './moderation.js';
import { findProfile, findPublicProfiles } from './repository.js';

const ANONYMOUS = 'Anonymous';
const USER_TTL_MS = 10 * 60 * 1000;

interface UserState {
  displayName: string;
  lockedUntilMs: number | null;
}

interface CachedEntry extends UserState {
  expiresAt: number;
}

const cache = new Map<string, CachedEntry>();
const inFlight = new Map<string, Promise<UserState>>();

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return ANONYMOUS;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : ANONYMOUS;
}


async function fetchUserState(userId: string): Promise<UserState> {
  try {
    const profile = await findProfile(userId);
    return profile ? { displayName: normalizeDisplayName(profile.displayName), lockedUntilMs: profile.lockedUntilMs } : { displayName: ANONYMOUS, lockedUntilMs: null };
  } catch {
    return { displayName: ANONYMOUS, lockedUntilMs: null };
  }
}

async function getUserState(userId: string): Promise<UserState> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached;
  if (cached) cache.delete(userId);

  const existing = inFlight.get(userId);
  if (existing) return existing;

  const pending = fetchUserState(userId).then((state) => {
    cache.set(userId, { ...state, expiresAt: Date.now() + USER_TTL_MS });
    return state;
  }).finally(() => {
    inFlight.delete(userId);
  });

  inFlight.set(userId, pending);
  return pending;
}

export async function getDisplayName(userId: string): Promise<string> {
  const state = await getUserState(userId);
  return renderPublicName(
    userId,
    state.displayName,
    { strikes: 0, lockedUntilMs: state.lockedUntilMs },
    Date.now(),
  );
}

// Single SQL round-trip against auth.users for any IDs not already cached.
// The previous implementation fanned out one Supabase Auth admin HTTP call
// per user, which dominated latency on multi-user views (gauntlet/daily
// leaderboards) and scaled linearly with player count.
async function fetchUserStatesBatch(userIds: string[]): Promise<Map<string, UserState>> {
  try { return await findPublicProfiles(userIds); }
  catch { return new Map(); }
}

export async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  const now = Date.now();
  const result = new Map<string, string>();
  const toFetch: string[] = [];

  for (const id of uniqueIds) {
    const cached = cache.get(id);
    if (cached && cached.expiresAt > now) {
      result.set(
        id,
        renderPublicName(
          id,
          cached.displayName,
          { strikes: 0, lockedUntilMs: cached.lockedUntilMs },
          now,
        ),
      );
    } else {
      if (cached) cache.delete(id);
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    const fetched = await fetchUserStatesBatch(toFetch);
    for (const id of toFetch) {
      const state = fetched.get(id) ?? { displayName: ANONYMOUS, lockedUntilMs: null };
      cache.set(id, { ...state, expiresAt: now + USER_TTL_MS });
      result.set(
        id,
        renderPublicName(
          id,
          state.displayName,
          { strikes: 0, lockedUntilMs: state.lockedUntilMs },
          now,
        ),
      );
    }
  }

  return result;
}

export function invalidateDisplayName(userId: string): void {
  cache.delete(userId);
}
