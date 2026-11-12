import { type Game, type Position, type Word } from 'models';
import { type GameResults } from '../../gameplay/types';
import { API_URL, rebaseGameStart, sessionHeaders } from '../../platform/http';


export const createGame = async (): Promise<{
  game: Game;
  sessionId: string;
}> => {
  const response = await fetch(`${API_URL}/game/create`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
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
  const data = await response.json();
  return { ...data, game: rebaseGameStart(data.game, data.server_now) };
};

export const cancelGame = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/game/cancel`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  const data = await response.json();
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
  const data = await response.json();
  return { ...data, game: data.game ? rebaseGameStart(data.game, data.server_now) : null };
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
  const session: ActiveFreePlaySession | null = data.session ?? null;
  if (session) session.game = rebaseGameStart(session.game, data.server_now);
  return session;
};

export const fetchResults = async (): Promise<GameResults> => {
  const response = await fetch(`${API_URL}/game/results`, {
    headers: await sessionHeaders(),
  });
  const data = await response.json();
  return data as GameResults;
};
