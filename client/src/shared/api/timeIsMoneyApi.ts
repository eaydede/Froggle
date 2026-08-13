import type { Position } from 'models';
import { supabase } from '../supabase';
import { sampleClockOffset } from '../timing/serverClock';

const BASE = '/api/daily/time-is-money';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export interface TimeIsMoneyStatusResponse {
  date: string;
  number: number;
  state: 'unplayed' | 'in-progress' | 'completed';
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  timeLimit: number | null;
}

export interface TimeIsMoneySession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: string;
  ended_at: string | null;
  points: number;
  word_count: number;
  longest_word: string;
  board_size: number;
  min_word_length: number;
  time_limit: number;
  salt: string;
  wordHashes: string[];
  /** Server clock at response time; paired with the local clock to correct
   *  timer math for a skewed device clock. */
  server_now?: number;
  /** server − device clock offset, sampled by the client on receipt. */
  clock_offset_ms?: number;
}

export interface TimeIsMoneyMissedWord {
  word: string;
  path: Position[];
  score: number;
}

export interface TimeIsMoneyRosterEntry {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  rank: number;
  isYou: boolean;
}

export interface TimeIsMoneyResultResponse {
  date: string;
  number: number;
  board: string[][];
  found_words: string[];
  missed_words: TimeIsMoneyMissedWord[];
  points: number;
  word_count: number;
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  roster: TimeIsMoneyRosterEntry[];
  /** Per-word find rate across today's finishers, keyed by upper-cased word.
   *  Drives the solo-results popularity affordance, same as timed/zen. */
  find_percents?: Record<string, number>;
}

export type TimeIsMoneySubmitResult =
  | { valid: true; word: string; score: number; points: number }
  | { valid: false; reason?: string };

export async function fetchTimeIsMoneyStatus(): Promise<TimeIsMoneyStatusResponse> {
  const res = await fetch(`${BASE}/status`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch Time is Money status');
  return res.json();
}

export async function fetchTimeIsMoneySession(
  date: string,
): Promise<TimeIsMoneySession | null> {
  const res = await fetch(`${BASE}/session/${date}`, { headers: await authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  const session: TimeIsMoneySession | null = data.session ?? null;
  if (session) session.clock_offset_ms = sampleClockOffset(session.server_now);
  return session;
}

export async function startTimeIsMoneySession(
  date: string,
): Promise<TimeIsMoneySession | null> {
  const res = await fetch(`${BASE}/session/${date}/start`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const session: TimeIsMoneySession | null = data.session ?? null;
  if (session) session.clock_offset_ms = sampleClockOffset(session.server_now);
  return session;
}

export async function submitTimeIsMoneyWord(
  date: string,
  path: Position[],
): Promise<TimeIsMoneySubmitResult> {
  const res = await fetch(`${BASE}/session/${date}/word`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function endTimeIsMoneySession(
  date: string,
): Promise<TimeIsMoneySession | null> {
  const res = await fetch(`${BASE}/session/${date}/end`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export async function fetchTimeIsMoneyResult(
  date: string,
): Promise<TimeIsMoneyResultResponse | null> {
  const res = await fetch(`${BASE}/results/${date}`, { headers: await authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

export interface TimeIsMoneyComparePlayer {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: { word: string; score: number }[];
}

export interface TimeIsMoneyCompareResponse {
  date: string;
  board: string[][];
  me: TimeIsMoneyComparePlayer;
  them: TimeIsMoneyComparePlayer;
}

export type TimeIsMoneyCompareError =
  | 'unplayed'
  | 'opponent-missing'
  | 'forbidden'
  | 'unknown';

/** Fetches a side-by-side compare payload for the given date and opponent.
 *  Mirrors the timed/zen compare fetchers so the results screen's standings
 *  can open a comparison. */
export async function fetchTimeIsMoneyCompare(
  date: string,
  otherUserId: string,
): Promise<
  { ok: true; data: TimeIsMoneyCompareResponse } | { ok: false; error: TimeIsMoneyCompareError }
> {
  const res = await fetch(
    `${BASE}/compare/${date}?other=${encodeURIComponent(otherUserId)}`,
    { headers: await authHeaders() },
  );
  if (res.ok) return { ok: true, data: await res.json() };
  if (res.status === 409) return { ok: false, error: 'unplayed' };
  if (res.status === 404) return { ok: false, error: 'opponent-missing' };
  if (res.status === 400) return { ok: false, error: 'forbidden' };
  return { ok: false, error: 'unknown' };
}
