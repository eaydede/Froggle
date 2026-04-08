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
