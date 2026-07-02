import type { Position } from 'models';
import type {
  ExperimentalModeKey,
  ExperimentalModeState,
  VoteSentiment,
} from 'models/experimental';
import { supabase } from '../supabase';

const API_URL = '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

const BASE = `${API_URL}/daily/experimental`;

export interface ExperimentalTileStatus {
  modeKey: ExperimentalModeKey;
  state: 'unplayed' | 'in-progress' | 'completed';
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  playersCount: number;
}

export interface ExperimentalStatusResponse {
  date: string;
  number: number;
  modes: ExperimentalTileStatus[];
}

export interface ExperimentalTodayResponse {
  mode: ExperimentalModeKey;
  date: string;
  number: number;
  board: string[][];
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  salt: string;
  wordHashes: string[];
  // Populated only for Golden Ticket. Empty for other modes so the client's
  // local validator can uniformly initialise a golden hash set even when the
  // mode has no wildcard.
  goldenHashes: string[];
}

export interface ExperimentalSession {
  date: string;
  modeKey: ExperimentalModeKey;
  board: string[][];
  state: ExperimentalModeState;
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
  goldenHashes: string[];
}

export interface ExperimentalMissedWord {
  word: string;
  path: Position[];
  score: number;
}

export interface ExperimentalRosterEntry {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  rank: number;
  isYou: boolean;
}

// All-time counts of each sentiment for one experimental mode. Only present
// on the results payload once the player has voted themselves — early voters
// can't peek at the aggregate before committing.
export interface ExperimentalVoteTallies {
  up: number;
  meh: number;
  down: number;
}

export interface ExperimentalResultResponse {
  mode: ExperimentalModeKey;
  date: string;
  number: number;
  board: string[][];
  state: ExperimentalModeState;
  found_words: string[];
  missed_words: ExperimentalMissedWord[];
  points: number;
  word_count: number;
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  roster: ExperimentalRosterEntry[];
  vote: VoteSentiment | null;
  voteTallies: ExperimentalVoteTallies | null;
}

// A single scored word from a submission. Normal submissions produce one; a
// Golden Ticket submission through the wildcard can produce many at once.
export interface SubmittedScoredWord {
  word: string;
  score: number;
}

export type ExperimentalSubmitResult =
  | { valid: true; words: SubmittedScoredWord[]; totalScore: number; points: number }
  | { valid: false; reason?: string };

export async function fetchExperimentalStatus(): Promise<ExperimentalStatusResponse> {
  const res = await fetch(`${BASE}/status`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch experimental status');
  return res.json();
}

export async function fetchExperimentalToday(
  mode: ExperimentalModeKey,
): Promise<ExperimentalTodayResponse | null> {
  const res = await fetch(`${BASE}/${mode}`, { headers: await authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchExperimentalSession(
  mode: ExperimentalModeKey,
  date: string,
): Promise<ExperimentalSession | null> {
  const res = await fetch(`${BASE}/${mode}/session/${date}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export async function startExperimentalSession(
  mode: ExperimentalModeKey,
  date: string,
): Promise<ExperimentalSession | null> {
  const res = await fetch(`${BASE}/${mode}/session/${date}/start`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export async function submitExperimentalWord(
  mode: ExperimentalModeKey,
  date: string,
  path: Position[],
): Promise<ExperimentalSubmitResult> {
  const res = await fetch(`${BASE}/${mode}/session/${date}/word`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function endExperimentalSession(
  mode: ExperimentalModeKey,
  date: string,
): Promise<ExperimentalSession | null> {
  const res = await fetch(`${BASE}/${mode}/session/${date}/end`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? null;
}

export async function fetchExperimentalResult(
  mode: ExperimentalModeKey,
  date: string,
): Promise<ExperimentalResultResponse | null> {
  const res = await fetch(`${BASE}/${mode}/results/${date}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

// The vote POST returns the fresh all-time tallies so the client can update
// the on-screen bar the moment the user votes — no refetch needed. Null on
// network failure so the caller can decide whether to fall back or ignore.
export async function castExperimentalVote(
  mode: ExperimentalModeKey,
  date: string,
  sentiment: VoteSentiment,
): Promise<{ sentiment: VoteSentiment; voteTallies: ExperimentalVoteTallies } | null> {
  const res = await fetch(`${BASE}/${mode}/vote/${date}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ sentiment }),
  });
  if (!res.ok) return null;
  return res.json();
}
