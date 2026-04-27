export type BoardSize = 4 | 5 | 6;

export type TimerOption = 60 | 120 | 180 | -1;

export type MinWordLength = 3 | 4 | 5;

export interface GameConfig {
  boardSize: BoardSize;
  timer: TimerOption;
  minWordLength: MinWordLength;
}
