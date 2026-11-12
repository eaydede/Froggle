import { type Position } from 'models';
import { API_URL, getJson, sessionHeaders } from '../../platform/http';
import { sampleClockOffset } from '../../platform/time/serverClock';
import { type WordDefinition } from '../results/hooks/useDefinition';


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
  /** Per-fetch salted hashes for client-side instant word validation.
   *  Server still re-validates every accepted word via the session word
   *  endpoint, so the hashes are a UX aid, not the security boundary. */
  salt: string;
  wordHashes: string[];
}

export const fetchDaily = async (): Promise<DailyInfo> => {
  return getJson<DailyInfo>(`${API_URL}/daily`);
};

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
  config: DailyConfig;
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

export const fetchDailyStats = async (
  options: { definitions?: boolean } = {},
): Promise<DailyStatsResponse> => {
  const definitions = options.definitions === false ? '?definitions=0' : '';
  return getJson<DailyStatsResponse>(`${API_URL}/daily/stats${definitions}`, {
    auth: true,
    errorPrefix: 'fetchDailyStats',
  });
};

export interface DailyConfig {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

// Session-based timed daily — mirrors the zen session shape. The salt +
// wordHashes are present while the session is still playable so the
// client can do local hash validation; they're stripped from the
// finalized response.
export interface DailyTimedSession {
  date: string;
  board: string[][];
  found_words: string[];
  started_at: string;
  ended_at: string | null;
  points: number;
  word_count: number;
  longest_word: string;
  time_limit: number;
  total_findable: number;
  salt: string;
  wordHashes: string[];
  /** Server clock at response time; paired with the local clock to correct
   *  timer math for a skewed device clock. */
  server_now?: number;
  /** server − device clock offset, sampled by the client on receipt. */
  clock_offset_ms?: number;
}

export const fetchDailyTimedSession = async (
  date: string,
): Promise<DailyTimedSession | null> => {
  const response = await fetch(`${API_URL}/daily/session/${date}`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const session: DailyTimedSession | null = data.session ?? null;
  if (session) session.clock_offset_ms = sampleClockOffset(session.server_now);
  return session;
};

export const startDailyTimedSession = async (
  date: string,
): Promise<DailyTimedSession> => {
  const response = await fetch(`${API_URL}/daily/session/${date}/start`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  const session: DailyTimedSession = data.session;
  session.clock_offset_ms = sampleClockOffset(session.server_now);
  return session;
};

export const submitDailyTimedWord = async (
  date: string,
  path: Position[],
): Promise<{ valid: boolean; word?: string; score?: number; reason?: string }> => {
  const response = await fetch(`${API_URL}/daily/session/${date}/word`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ path }),
  });
  return response.json();
};

export const endDailyTimedSession = async (
  date: string,
): Promise<DailyTimedSession | null> => {
  const response = await fetch(`${API_URL}/daily/session/${date}/end`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.session ?? null;
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
  config: DailyConfig;
  /** Per-word percentage of today's daily players who found this word
   *  (uppercase keys, 0–100). Drives the All-words popularity column. */
  find_percents?: Record<string, number>;
}

export const fetchDailyResult = async (date: string): Promise<DailyResultResponse | null> => {
  const data = await getJson<{ result?: DailyResultResponse | null }>(
    `${API_URL}/daily/results/${date}`,
    { auth: true },
  );
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
  /** Mean point score across all submissions for the day. */
  avgScore: number;
  rankings: {
    points: LeaderboardRankingEntry[];
    words: LeaderboardRankingEntry[];
    rarity: LeaderboardRankingEntry[];
  };
  currentPlayer: LeaderboardPlayerCard | null;
}

export const fetchLeaderboard = async (date: string): Promise<LeaderboardResponse> => {
  return getJson<LeaderboardResponse>(`${API_URL}/daily/leaderboard/${date}`, { auth: true });
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
