import { type Position } from 'models';
import { API_URL, getJson, sessionHeaders } from '../../platform/http';
import { type DailyCompareError, type DailyCompareResponse, type DailyResultMissedWord, type DailyStatsDay } from '../timed-daily/api';


export interface DailyZenStatsResponse {
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}

export const fetchDailyZenStats = async (
  options: { definitions?: boolean } = {},
): Promise<DailyZenStatsResponse> => {
  const definitions = options.definitions === false ? '?definitions=0' : '';
  return getJson<DailyZenStatsResponse>(`${API_URL}/daily/zen/stats${definitions}`, {
    auth: true,
    errorPrefix: 'fetchDailyZenStats',
  });
};

// ─── Zen Daily mode ────────────────────────────────────────────────────

export interface DailyZenMeta {
  date: string;
  number: number;
  seed: number;
  board: string[][];
  config: {
    boardSize: number;
    minWordLength: number;
  };
}

export interface DailyZenInfo extends DailyZenMeta {
  /** Salted word hashes + salt for client-side validation. The salt is per-fetch. */
  salt: string;
  wordHashes: string[];
}

export interface DailyZenSession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: string;
  last_active_at: string;
  ended_at: string | null;
  ended_by_player: boolean;
  points: number;
  word_count: number;
  longest_word: string;
  /** Mode the player committed to when starting the day's session. Locked
   *  for the day — see startDailyZenSession. */
  is_competitive: boolean;
  /** Total findable words on this board — server computed each fetch. */
  total_findable: number;
  /** Sum of every findable word's score on this board. Locked at session
   *  start. Null on legacy rows that predate the column. */
  theoretical_max_score: number | null;
  /** Present while the session is playable; absent / empty after end. */
  salt: string;
  wordHashes: string[];
}

export const fetchDailyZen = async (): Promise<DailyZenInfo> => {
  return getJson<DailyZenInfo>(`${API_URL}/daily/zen`);
};

export const fetchDailyZenMeta = async (): Promise<DailyZenMeta> => {
  return getJson<DailyZenMeta>(`${API_URL}/daily/zen/meta`);
};

export const fetchDailyZenSession = async (
  date: string,
): Promise<DailyZenSession | null> => {
  const response = await fetch(`${API_URL}/daily/zen/session/${date}`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.session ?? null;
};

export const startDailyZenSession = async (
  date: string,
  isCompetitive: boolean,
): Promise<DailyZenSession> => {
  const response = await fetch(`${API_URL}/daily/zen/session/${date}/start`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ isCompetitive }),
  });
  const data = await response.json();
  return data.session;
};

export const submitDailyZenWord = async (
  date: string,
  path: Position[],
): Promise<{ valid: boolean; word?: string; score?: number; reason?: string }> => {
  const response = await fetch(`${API_URL}/daily/zen/session/${date}/word`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ path }),
  });
  return response.json();
};

export const endDailyZenSession = async (
  date: string,
): Promise<DailyZenSession | null> => {
  const response = await fetch(`${API_URL}/daily/zen/session/${date}/end`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.session ?? null;
};

export interface DailyZenResultResponse {
  date: string;
  found_words: DailyResultMissedWord[];
  board: string[][];
  missed_words: DailyResultMissedWord[];
  ended_at: string;
  ended_by_player: boolean;
  is_competitive: boolean;
  /** Sum of every findable word's score on this board, locked at session
   *  start. Null on legacy rows that predate the column. */
  theoretical_max_score: number | null;
  /** Per-word percentage of finalized zen players who found this word
   *  (uppercase keys, 0–100). Drives the All-words popularity column. */
  find_percents?: Record<string, number>;
}

export const fetchDailyZenResult = async (
  date: string,
): Promise<DailyZenResultResponse | null> => {
  const response = await fetch(`${API_URL}/daily/zen/results/${date}`, {
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  return data.result ?? null;
};

export interface DailyZenLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  wordCount: number;
  longestWord: string;
}

export interface DailyZenLeaderboardInProgressEntry {
  userId: string;
  displayName: string;
  isCompetitive: boolean;
}

export interface DailyZenLeaderboardCurrentPlayer {
  /** True when the player chose competitive mode for the day. Casual
   *  players never receive a rank, even after finishing. */
  isCompetitive: boolean;
  /** True only for competitive players who have finalized the puzzle.
   *  Competitive in-progress players are unranked until they finish. */
  ranked: boolean;
  /** True once the player has finalized today's session, regardless of mode.
   *  The compare feature gates on this — casual finishers can compare too. */
  completed: boolean;
  rank: number | null;
  points: number;
  wordsFound: number;
  longestWord: string;
  /** Size of the ranked list (completed competitive players only). */
  totalRankedPlayers: number;
}

export interface DailyZenLeaderboardResponse {
  puzzleNumber: number;
  /** Counts every player who has a row for the day — casual + competitive,
   *  in-progress + completed. */
  totalPlayers: number;
  /** How many players are mid-session right now (across both modes). */
  inProgressCount: number;
  /** Mean points across completed competitive rows only — casual and
   *  in-progress zeroes would otherwise drag the average down. */
  avgScore: number;
  rankings: {
    points: DailyZenLeaderboardEntry[];
    words: DailyZenLeaderboardEntry[];
  };
  inProgressPlayers: DailyZenLeaderboardInProgressEntry[];
  currentPlayer: DailyZenLeaderboardCurrentPlayer | null;
}

export const fetchDailyZenLeaderboard = async (
  date: string,
): Promise<DailyZenLeaderboardResponse> => {
  return getJson<DailyZenLeaderboardResponse>(
    `${API_URL}/daily/zen/leaderboard/${date}`,
    { auth: true },
  );
};

/** Fetches a side-by-side compare payload for a zen daily. The shape
 *  mirrors `DailyCompareResponse` so the existing compare page renders both
 *  modes; only the timer slot differs (zen returns timeLimit=0). */
export const fetchDailyZenCompare = async (
  date: string,
  otherUserId: string,
): Promise<{ ok: true; data: DailyCompareResponse } | { ok: false; error: DailyCompareError }> => {
  const response = await fetch(
    `${API_URL}/daily/zen/compare/${date}?other=${encodeURIComponent(otherUserId)}`,
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
