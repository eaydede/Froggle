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

export async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => [userId, await getDisplayName(userId)] as const),
  );
  return new Map(entries);
}

export function invalidateDisplayName(userId: string): void {
  cache.delete(userId);
}
