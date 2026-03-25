import { Position, Game, Word } from 'models';

const API_URL = '/api';

let sessionId: string | null = null;

export function getSessionId(): string | null {
  return sessionId;
}

function sessionHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  return headers;
}

export const createGame = async (): Promise<{
  game: Game;
  sessionId: string;
}> => {
  const response = await fetch(`${API_URL}/game/create`, {
    method: 'POST',
    headers: sessionHeaders(),
  });
  const data = await response.json();
  sessionId = data.sessionId;
  return data;
};

export const startGame = async (
  durationSeconds: number = 180, 
  boardSize: number = 4, 
  minWordLength: number = 3
): Promise<{
  game: Game;
  wordHashes: string[];
  salt: string;
}> => {
  const response = await fetch(`${API_URL}/game/start`, {
    method: 'POST',
    headers: sessionHeaders(),
    body: JSON.stringify({ durationSeconds, boardSize, minWordLength }),
  });
  return response.json();
};

export const cancelGame = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/game/cancel`, {
    method: 'POST',
    headers: sessionHeaders(),
  });
  const data = await response.json();
  sessionId = null;
  return data;
};

export const endGame = async (): Promise<{ game: Game }> => {
  const response = await fetch(`${API_URL}/game/end`, {
    method: 'POST',
    headers: sessionHeaders(),
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
    headers: sessionHeaders(),
    body: JSON.stringify({ path }),
  });
  return response.json();
};

export const fetchGameState = async (): Promise<{
  game: Game | null;
  words: Word[];
}> => {
  const response = await fetch(`${API_URL}/game/state`, {
    headers: sessionHeaders(),
  });
  return response.json();
};

export interface ScoredWord {
  word: string;
  path: Position[];
  score: number;
}

export interface GameResults {
  board: string[][];
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
}

export const fetchResults = async (): Promise<GameResults> => {
  const response = await fetch(`${API_URL}/game/results`, {
    headers: sessionHeaders(),
  });
  return response.json();
};
