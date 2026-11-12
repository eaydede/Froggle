import { API_URL, sessionHeaders } from '../../platform/http';


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
