import type { Position } from 'models';
import { supabase } from '../supabase';

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
  return data.session ?? null;
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
  return data.session ?? null;
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
