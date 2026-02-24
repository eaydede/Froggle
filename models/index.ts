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
  status: GameStatus;
}
export interface Room {
  code: string;
  players: Player[];
  game: Game | null;
}

export enum GameStatus {
  Waiting,
  InProgress,
  Finished
}