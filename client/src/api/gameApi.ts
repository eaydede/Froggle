import { Position, Game, Word } from 'models';

const API_URL = 'http://localhost:3000/api';

export const createGame = async (): Promise<{
  game: Game;
}> => {
  const response = await fetch(`${API_URL}/game/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};

export const startGame = async (
  durationSeconds: number = 180, 
  boardSize: number = 4, 
  minWordLength: number = 3
): Promise<{
  game: Game;
}> => {
  const response = await fetch(`${API_URL}/game/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationSeconds, boardSize, minWordLength }),
  });
  return response.json();
};

export const cancelGame = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/game/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};

export const endGame = async (): Promise<{ game: Game }> => {
  const response = await fetch(`${API_URL}/game/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return response.json();
};

export const fetchGameState = async (): Promise<{
  game: Game | null;
  words: Word[];
}> => {
  const response = await fetch(`${API_URL}/game/state`);
  return response.json();
};
