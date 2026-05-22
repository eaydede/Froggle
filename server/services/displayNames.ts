import { sql } from 'kysely';
import { getDb } from '../db/index.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { renderPublicName } from './nameModeration.js';

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

function parseLockedUntil(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function fetchUserState(userId: string): Promise<UserState> {
  try {
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    return {
      displayName: normalizeDisplayName(data.user?.user_metadata?.display_name),
      lockedUntilMs: parseLockedUntil(data.user?.app_metadata?.nameLockedUntil),
    };
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
interface AuthUserRow {
  id: string;
  raw_user_meta_data: Record<string, unknown> | null;
  raw_app_meta_data: Record<string, unknown> | null;
}

async function fetchUserStatesBatch(userIds: string[]): Promise<Map<string, UserState>> {
  const out = new Map<string, UserState>();
  if (userIds.length === 0) return out;
  try {
    const result = await sql<AuthUserRow>`
      select id::text as id, raw_user_meta_data, raw_app_meta_data
      from auth.users
      where id = any(${userIds}::uuid[])
    `.execute(getDb());
    for (const row of result.rows) {
      out.set(row.id, {
        displayName: normalizeDisplayName(row.raw_user_meta_data?.display_name),
        lockedUntilMs: parseLockedUntil(
          (row.raw_app_meta_data as { nameLockedUntil?: unknown } | null)?.nameLockedUntil,
        ),
      });
    }
  } catch {
    // Leave `out` empty; caller treats missing IDs as Anonymous below.
  }
  return out;
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
