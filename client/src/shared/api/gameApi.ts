import { Position, Game, Word } from 'models';
import type { GameResults } from '../types';
import { supabase } from '../supabase';

const API_URL = '/api';

let sessionId: string | null = null;

export function getSessionId(): string | null {
  return sessionId;
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  // Include Supabase auth token if available
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export const createGame = async (): Promise<{
  game: Game;
  sessionId: string;
}> => {
  const response = await fetch(`${API_URL}/game/create`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  sessionId = data.sessionId;
  return data;
};

export const startGame = async (
  durationSeconds: number = 180, 
  boardSize: number = 4, 
  minWordLength: number = 3,
  predefinedBoard?: string[][],
  seed?: number
): Promise<{
  game: Game;
  wordHashes: string[];
  salt: string;
  seed: number;
}> => {
  const response = await fetch(`${API_URL}/game/start`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ durationSeconds, boardSize, minWordLength, board: predefinedBoard, seed }),
  });
  return response.json();
};

export const cancelGame = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/game/cancel`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  sessionId = null;
  return data;
};

export const endGame = async (): Promise<{ game: Game }> => {
  const response = await fetch(`${API_URL}/game/end`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  return response.json();
};

export const submitWord = async (path: Position[]): Promise<{
  valid: boolean;
  word?: string;
  reason?: string;
}> => {
  const response = await fetch(`${API_URL}/game/submit`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ path }),
  });
  return response.json();
};

export const fetchGameState = async (): Promise<{
  game: Game | null;
  words: Word[];
}> => {
  const response = await fetch(`${API_URL}/game/state`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export const fetchResults = async (): Promise<GameResults> => {
  const response = await fetch(`${API_URL}/game/results`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export interface DailyInfo {
  date: string;
  number: number;
  seed: number;
  board: string[][];
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
}

export const fetchDaily = async (): Promise<DailyInfo> => {
  const response = await fetch(`${API_URL}/daily`);
  return response.json();
};

// Mirrors DailyStatsResponse in server/services/DailyService.ts.
import type { WordDefinition } from '../../pages/results/hooks/useDefinition';

export type DailyState = 'completed' | 'missed' | 'unplayed';
export type StampTier = 'first' | 'second' | 'third' | 'top30' | null;

export interface DailyStatsDay {
  date: string;
  puzzleNumber: number;
  state: DailyState;
  points: number | null;
  wordsFound: number | null;
  longestWord: string | null;
  longestWordDefinition: WordDefinition | null;
  stampTier: StampTier;
  playersCount: number;
}

export interface DailyStatsResponse {
  currentStreak: number;
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}

export const fetchDailyStats = async (): Promise<DailyStatsResponse> => {
  const response = await fetch(`${API_URL}/daily/stats`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) throw new Error(`fetchDailyStats: ${response.status}`);
  return response.json();
};

export const recordDailyResultToServer = async (date: string, foundWords: string[], board: string[][]): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/daily/results`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ date, found_words: foundWords, board }),
  });
  return response.json();
};

export interface DailyResultMissedWord {
  word: string;
  path: { row: number; col: number }[];
  score: number;
}

export interface DailyResultResponse {
  found_words: string[];
  board: string[][];
  /** Computed server-side at read time; absent in very old stored results
   *  but always present from the current endpoint. */
  missed_words?: DailyResultMissedWord[];
}

export const fetchDailyResult = async (date: string): Promise<DailyResultResponse | null> => {
  const response = await fetch(`${API_URL}/daily/results/${date}`, {
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  return data.result ?? null;
};

export interface LeaderboardRankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  subLabel: string;
  isCurrentUser: boolean;
}

export interface LeaderboardPlayerCard {
  points: number;
  wordsFound: number;
  longestWord: string;
  rank: number;
  totalPlayers: number;
  topPercent: number | null;
  accolade: string;
}

export interface LeaderboardResponse {
  puzzleNumber: number;
  totalPlayers: number;
  rankings: {
    points: LeaderboardRankingEntry[];
    words: LeaderboardRankingEntry[];
    rarity: LeaderboardRankingEntry[];
  };
  currentPlayer: LeaderboardPlayerCard | null;
}

export const fetchLeaderboard = async (date: string): Promise<LeaderboardResponse> => {
  const response = await fetch(`${API_URL}/daily/leaderboard/${date}`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export interface DailyCompareScoredWord {
  word: string;
  score: number;
}

export interface DailyComparePlayer {
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  foundWords: DailyCompareScoredWord[];
}

export interface DailyCompareResponse {
  date: string;
  puzzleNumber: number;
  board: string[][];
  me: DailyComparePlayer;
  them: DailyComparePlayer;
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
}

export type DailyCompareError = 'unplayed' | 'opponent-missing' | 'forbidden' | 'unknown';

/** Fetches a side-by-side compare payload for the given date and opponent.
 *  Returns a discriminated result so callers can render specific states
 *  (you-haven't-played, opponent-missing) without guessing from HTTP codes. */
export const fetchDailyCompare = async (
  date: string,
  otherUserId: string,
): Promise<{ ok: true; data: DailyCompareResponse } | { ok: false; error: DailyCompareError }> => {
  const response = await fetch(
    `${API_URL}/daily/compare/${date}?other=${encodeURIComponent(otherUserId)}`,
    { headers: await sessionHeaders() },
  );
  if (response.ok) {
    return { ok: true, data: await response.json() };
  }
  if (response.status === 409) return { ok: false, error: 'unplayed' };
  if (response.status === 404) return { ok: false, error: 'opponent-missing' };
  if (response.status === 400) return { ok: false, error: 'forbidden' };
  return { ok: false, error: 'unknown' };
};

export interface DailyHistoryEntry {
  date: string;
  puzzleNumber: number;
  points: number;
  wordsFound: number;
  isToday: boolean;
}

export const fetchDailyHistory = async (): Promise<{ entries: DailyHistoryEntry[] }> => {
  const response = await fetch(`${API_URL}/daily/history`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export const fetchProfile = async (): Promise<{ display_name: string }> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export const updateProfile = async (displayName: string): Promise<{ display_name: string }> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    method: 'PUT',
    headers: await sessionHeaders(),
    body: JSON.stringify({ display_name: displayName }),
  });
  return response.json();
};
