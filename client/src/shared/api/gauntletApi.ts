import type { InvalidSubmission, Position } from 'models';
import type {
  GauntletEntry,
  GauntletModifier,
  GauntletRoundConfig,
  GauntletRoundKind,
  GauntletStatsResponse,
} from 'models/gauntlet';
import { supabase } from '../supabase';

const API_URL = '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export interface GauntletRoundSession {
  date: string;
  roundIndex: number;
  roundKind: GauntletRoundKind;
  board: string[][];
  modifier: GauntletModifier;
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
  foundWords: string[];
  points: number;
  wordCount: number;
  longestWord: string;
  startedAt: string;
  endedAt: string | null;
  completedAt: string | null;
  total_findable: number;
  salt: string;
  wordHashes: string[];
}

export interface GauntletStatusResponse {
  date: string;
  puzzleNumber: number;
  entry: GauntletEntry;
  nextRoundIndex: number | null;
  upcomingConfigs: Record<number, GauntletRoundConfig>;
  roundKinds: GauntletRoundKind[];
}

export async function fetchGauntletStatus(): Promise<GauntletStatusResponse> {
  const res = await fetch(`${API_URL}/daily/gauntlet`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch gauntlet status');
  return res.json();
}

// Standings payload for an arbitrary date — used by the results page to
// render historic gauntlets browsed through the date picker.
export async function fetchGauntletStatusForDate(
  date: string,
): Promise<GauntletStatusResponse> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/status`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch gauntlet status');
  return res.json();
}

// Per-day gauntlet history that populates the standings date picker.
export async function fetchGauntletStats(): Promise<GauntletStatsResponse> {
  const res = await fetch(`${API_URL}/daily/gauntlet/stats`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch gauntlet stats');
  return res.json();
}

export interface GauntletPreviewResponse {
  date: string;
  puzzleNumber: number;
  rounds: Array<{ config: GauntletRoundConfig }>;
}

export async function fetchGauntletPreview(date: string): Promise<GauntletPreviewResponse> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/preview`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch gauntlet preview');
  return res.json();
}

export async function fetchGauntletRoundSession(
  date: string,
  round: number,
): Promise<GauntletRoundSession | null> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/round/${round}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export async function startGauntletRound(
  date: string,
  round: number,
): Promise<GauntletRoundSession | { error: string }> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/round/${round}/start`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'unknown' };
  return data.session;
}

export async function submitGauntletWord(
  date: string,
  round: number,
  path: Position[],
): Promise<{ valid: boolean; word?: string; score?: number; reason?: string }> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/round/${round}/word`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function endGauntletRound(
  date: string,
  round: number,
): Promise<GauntletRoundSession | null> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/round/${round}/end`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export interface GauntletRoundMissedWord {
  word: string;
  path: { row: number; col: number }[];
  score: number;
}

export interface GauntletRoundResultResponse {
  date: string;
  roundIndex: number;
  roundKind: GauntletRoundKind;
  modifier: GauntletModifier;
  config: { boardSize: number; timeLimit: number; minWordLength: number };
  board: string[][];
  found_words: string[];
  /** Per-word find offsets in seconds, index-aligned to `found_words`. */
  word_times?: (number | null)[];
  invalid_submissions?: InvalidSubmission[];
  points: number;
  word_count: number;
  longest_word: string;
  missed_words: GauntletRoundMissedWord[];
  completed_at: string | null;
}

export async function fetchGauntletRoundResult(
  date: string,
  round: number,
): Promise<GauntletRoundResultResponse | null> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/round/${round}/results`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

export interface GauntletLeaderboardResponse {
  date: string;
  puzzleNumber: number;
  currentUserId: string | null;
  perRound: Array<{
    userId: string;
    displayName: string;
    roundIndex: number;
    points: number;
    wordCount: number;
    rank: number;
  }>;
  aggregate: Array<{
    userId: string;
    displayName: string;
    roundRanks: number[];
    rankSum: number;
    aggregateRank: number;
  }>;
}

export async function fetchGauntletLeaderboard(
  date: string,
): Promise<GauntletLeaderboardResponse> {
  const res = await fetch(`${API_URL}/daily/gauntlet/${date}/leaderboard`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch gauntlet leaderboard');
  return res.json();
}

export interface GauntletCompareResponse {
  date: string;
  roundIndex: number;
  roundKind: GauntletRoundKind;
  modifier: GauntletModifier;
  puzzleNumber: number;
  board: string[][];
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  me: {
    userId: string;
    displayName: string;
    points: number;
    wordCount: number;
    foundWords: { word: string; score: number; timeSeconds?: number | null }[];
  };
  them: {
    userId: string;
    displayName: string;
    points: number;
    wordCount: number;
    foundWords: { word: string; score: number; timeSeconds?: number | null }[];
  };
}

export type GauntletCompareError =
  | 'unplayed'
  | 'opponent-missing'
  | 'forbidden'
  | 'unknown';

export type GauntletCompareResult =
  | { ok: true; data: GauntletCompareResponse }
  | { ok: false; error: GauntletCompareError };

export async function fetchGauntletCompare(
  date: string,
  round: number,
  otherUserId: string,
): Promise<GauntletCompareResult> {
  const res = await fetch(
    `${API_URL}/daily/gauntlet/${date}/round/${round}/compare?other=${otherUserId}`,
    { headers: await authHeaders() },
  );
  if (res.ok) return { ok: true, data: await res.json() };
  if (res.status === 409) return { ok: false, error: 'unplayed' };
  if (res.status === 404) return { ok: false, error: 'opponent-missing' };
  if (res.status === 403) return { ok: false, error: 'forbidden' };
  return { ok: false, error: 'unknown' };
}
