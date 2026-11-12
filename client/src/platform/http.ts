import type { Game } from 'models';
import { supabase } from './supabase';
import { sampleClockOffset, toDeviceClock } from './time/serverClock';

export const API_URL = '/api';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly url: string) {
    super(`Request failed (${status}): ${url}`);
    this.name = 'HttpError';
  }
}

export async function sessionHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

const pendingGets = new Map<string, Promise<unknown>>();

export async function getJson<T>(url: string, options: { auth?: boolean; errorPrefix?: string; } = {}): Promise<T> {
  const headers = options.auth ? await sessionHeaders() : undefined;
  const key = `${url}|${headers?.Authorization ?? ''}`;
  const existing = pendingGets.get(key);
  if (existing) return existing as Promise<T>;

  const pending = fetch(url, { headers }).then(async response => {
    if (!response.ok) throw new HttpError(response.status, url);
    return response.json() as Promise<T>;
  }).finally(() => pendingGets.delete(key));
  pendingGets.set(key, pending);
  return pending;
}

export function rebaseGameStart(game: Game, serverNow: number | undefined): Game {
  return game.startedAt > 0
    ? { ...game, startedAt: toDeviceClock(game.startedAt, sampleClockOffset(serverNow)) }
    : game;
}
