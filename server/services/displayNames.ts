import { getSupabaseAdmin } from '../supabaseAdmin.js';

const ANONYMOUS = 'Anonymous';
const DISPLAY_NAME_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { displayName: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return ANONYMOUS;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : ANONYMOUS;
}

async function fetchDisplayName(userId: string): Promise<string> {
  try {
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    return normalizeDisplayName(data.user?.user_metadata?.display_name);
  } catch {
    return ANONYMOUS;
  }
}

export async function getDisplayName(userId: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.displayName;
  if (cached) cache.delete(userId);

  const existing = inFlight.get(userId);
  if (existing) return existing;

  const pending = fetchDisplayName(userId).then((displayName) => {
    cache.set(userId, {
      displayName,
      expiresAt: Date.now() + DISPLAY_NAME_TTL_MS,
    });
    return displayName;
  }).finally(() => {
    inFlight.delete(userId);
  });

  inFlight.set(userId, pending);
  return pending;
}

export async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => [userId, await getDisplayName(userId)] as const),
  );
  return new Map(entries);
}

export function setCachedDisplayName(userId: string, displayName: string): void {
  cache.set(userId, {
    displayName: normalizeDisplayName(displayName),
    expiresAt: Date.now() + DISPLAY_NAME_TTL_MS,
  });
}
