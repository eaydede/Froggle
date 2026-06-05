import { Position, Game, Word } from 'models';
import type { GameResults } from '../types';
import { supabase } from '../supabase';

const API_URL = '/api';

let sessionId: string | null = null;
const inFlightGets = new Map<string, Promise<unknown>>();

export function getSessionId(): string | null {
  return sessionId;
}

export async function sessionHeaders(): Promise<Record<string, string>> {
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

async function getJson<T>(
  url: string,
  options: { auth?: boolean; errorPrefix?: string } = {},
): Promise<T> {
  const headers = options.auth ? await sessionHeaders() : undefined;
  const key = [
    url,
    headers?.Authorization ?? '',
    headers?.['X-Session-Id'] ?? '',
  ].join('|');

  const existing = inFlightGets.get(key);
  if (existing) return existing as Promise<T>;

  const pending = fetch(url, headers ? { headers } : undefined)
    .then(async (response) => {
      if (options.errorPrefix && !response.ok) {
        throw new Error(`${options.errorPrefix}: ${response.status}`);
      }
      return response.json() as Promise<T>;
    })
    .finally(() => {
      inFlightGets.delete(key);
    });

  inFlightGets.set(key, pending);
  return pending;
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
  seed?: number,
  challengeId?: string,
  isDaily?: boolean,
): Promise<{
  game: Game;
  wordHashes: string[];
  salt: string;
  seed: number;
}> => {
  const response = await fetch(`${API_URL}/game/start`, {
    method: 'POST',
    headers: await sessionHeaders(),
    body: JSON.stringify({ durationSeconds, boardSize, minWordLength, board: predefinedBoard, seed, challengeId, isDaily }),
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

export const endGame = async (): Promise<{ game: Game; freePlaySessionId?: string | null }> => {
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

export interface ActiveFreePlaySession {
  id: string;
  game: Game;
  found_words: string[];
  challenge_id: string | null;
  seed: number | null;
  salt: string;
  wordHashes: string[];
}

/** Server-authoritative resume payload for a free-play game still
 *  in progress. Returned by GET /api/game/active. Used at mount to
 *  rehydrate React state so a refresh during free play picks up where
 *  the player left off instead of restarting the timer. */
export const fetchActiveFreePlaySession = async (): Promise<ActiveFreePlaySession | null> => {
  const response = await fetch(`${API_URL}/game/active`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.session ?? null;
};

export const fetchResults = async (): Promise<GameResults> => {
  const response = await fetch(`${API_URL}/game/results`, {
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  return data as GameResults;
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
  /** Per-fetch salted hashes for client-side instant word validation.
   *  Server still re-validates every accepted word via the session word
   *  endpoint, so the hashes are a UX aid, not the security boundary. */
  salt: string;
  wordHashes: string[];
}

export const fetchDaily = async (): Promise<DailyInfo> => {
  return getJson<DailyInfo>(`${API_URL}/daily`);
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
}

export const fetchDailyTimedSession = async (
  date: string,
): Promise<DailyTimedSession | null> => {
  const response = await fetch(`${API_URL}/daily/session/${date}`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.session ?? null;
};

export const startDailyTimedSession = async (
  date: string,
): Promise<DailyTimedSession> => {
  const response = await fetch(`${API_URL}/daily/session/${date}/start`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  return data.session;
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

// ─── Free play history + challenges ───────────────────────────────────

export interface FreePlayHistoryEntry {
  sessionId: string;
  challengeId: string | null;
  date: string;
  completedAt: string;
  points: number;
  wordCount: number;
  longestWord: string;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  isOwner: boolean;
  newResults: number;
  /** Total players in this challenge. 1 for non-shared sessions. */
  playerCount: number;
  /** The caller's rank inside the challenge (1 = top score). Null for
   *  solo sessions where rank isn't meaningful. */
  rank: number | null;
}

export const fetchFreePlayUnread = async (): Promise<{ count: number }> => {
  const response = await fetch(`${API_URL}/freeplay/unread`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return { count: 0 };
  return response.json();
};

export interface FreePlaySessionResponse {
  sessionId: string;
  challengeId: string | null;
  seed: number | null;
  completedAt: string;
  board: string[][];
  foundWords: { word: string; path: { row: number; col: number }[]; score: number }[];
  missedWords: { word: string; path: { row: number; col: number }[]; score: number }[];
  config: { boardSize: number; timeLimit: number; minWordLength: number };
}

export const fetchFreePlaySession = async (
  sessionId: string,
): Promise<FreePlaySessionResponse | null> => {
  const response = await fetch(`${API_URL}/freeplay/session/${sessionId}`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  return response.json();
};

export const fetchFreePlayHistory = async (): Promise<{ entries: FreePlayHistoryEntry[] }> => {
  const response = await fetch(`${API_URL}/freeplay/history`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return { entries: [] };
  return response.json();
};

export const createFreePlayChallenge = async (sessionId: string): Promise<{ challengeId: string } | null> => {
  const response = await fetch(`${API_URL}/freeplay/share/${sessionId}`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  return response.json();
};

export interface FreePlayChallengePreview {
  challengeId: string;
  ownerUserId: string | null;
  ownerDisplayName: string;
  playerCount: number;
  alreadyPlayed: boolean;
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  seed: number | null;
}

export const fetchFreePlayChallengePreview = async (
  challengeId: string,
): Promise<FreePlayChallengePreview | null> => {
  const response = await fetch(`${API_URL}/freeplay/challenge/${challengeId}/preview`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return null;
  return response.json();
};

export const fetchFreePlayChallengeMe = async (
  challengeId: string,
): Promise<{ played: boolean; sessionId: string | null }> => {
  const response = await fetch(`${API_URL}/freeplay/challenge/${challengeId}/me`, {
    headers: await sessionHeaders(),
  });
  if (!response.ok) return { played: false, sessionId: null };
  return response.json();
};

export interface FreePlayChallengePlayer {
  userId: string | null;
  displayName: string;
  sessionId: string;
  /** Competition rank on points — equal points share a rank (1, 1, 3). */
  rank: number;
  points: number;
  wordCount: number;
  longestWord: string;
  completedAt: string;
  foundWords: { word: string; score: number }[];
  isOwner: boolean;
  isYou: boolean;
}

export interface FreePlayChallengeResponse {
  challengeId: string;
  board: string[][];
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  /** Numeric seed used to generate the board. Needed when sharing the
   *  challenge so a recipient's ConfigRoute can rebuild the same board. */
  seed: number | null;
  ownerUserId: string | null;
  players: FreePlayChallengePlayer[];
  /** Words on the board the caller didn't find. Sorted by score desc.
   *  Drives the "All words" toggle on the challenge results page. */
  missedWords: { word: string; path: { row: number; col: number }[]; score: number }[];
}

export type FreePlayChallengeError = 'not-found' | 'forbidden' | 'unknown';

export const fetchFreePlayChallenge = async (
  challengeId: string,
): Promise<
  | { ok: true; data: FreePlayChallengeResponse }
  | { ok: false; error: FreePlayChallengeError }
> => {
  const response = await fetch(`${API_URL}/freeplay/challenge/${challengeId}`, {
    headers: await sessionHeaders(),
  });
  if (response.ok) return { ok: true, data: await response.json() };
  if (response.status === 404) return { ok: false, error: 'not-found' };
  if (response.status === 403) return { ok: false, error: 'forbidden' };
  return { ok: false, error: 'unknown' };
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

export interface ProfileResponse {
  display_name: string;
  public_name: string;
  is_marked: boolean;
  is_locked: boolean;
  locked_until: string | null;
  mask_name: string;
  strikes: number;
}

export const fetchProfile = async (): Promise<ProfileResponse> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export type UpdateProfileResult =
  | { ok: true; profile: ProfileResponse }
  | { ok: false; reason: 'locked'; lockedUntil: string | null }
  | { ok: false; reason: 'unknown' };

export const submitFeedback = async (message: string): Promise<{ ok: boolean }> => {
  try {
    const response = await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: await sessionHeaders(),
      body: JSON.stringify({ message }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
};

export const updateProfile = async (displayName: string): Promise<UpdateProfileResult> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    method: 'PUT',
    headers: await sessionHeaders(),
    body: JSON.stringify({ display_name: displayName }),
  });
  if (response.ok) {
    return { ok: true, profile: await response.json() };
  }
  if (response.status === 403) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, reason: 'locked', lockedUntil: body?.locked_until ?? null };
  }
  return { ok: false, reason: 'unknown' };
};
