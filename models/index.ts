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

export interface Game {
  board: Board;
  startedAt: number;
  durationSeconds: number;
  status: GameState;
  boardSize?: number;
  minWordLength?: number;
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