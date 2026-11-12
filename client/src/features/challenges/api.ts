import { API_URL, sessionHeaders } from '../../platform/http';


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
