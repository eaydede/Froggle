export type Board = string[][]; 

export interface Position {
  row: number; 
  col: number; 
}

export interface Word {
  word: string;
  path: Position[];
  submittedAt: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  words: Word[];
}

export interface GameConfig {
  durationSeconds: number;
  boardSize: number;
  minWordLength: number;
}

export interface Game {
  board: Board;
  startedAt: number;
  status: GameState;
  config: GameConfig;
}
export interface Room {
  code: string;
  players: Player[];
  game: Game | null;
}

export enum GameState {
  Config = 'Config',
  InProgress = 'InProgress',
  Finished = 'Finished'
}

// FNV-1a hash - fast, synchronous, works in both Node and browser
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export function hashWord(word: string, salt: string): string {
  const salted = salt + ':' + word.toUpperCase() + ':' + salt;
  const h1 = fnv1a(salted);
  const h2 = fnv1a(salted + h1.toString(36));
  return h1.toString(36) + h2.toString(36);
}

export function generateSalt(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < 12; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}