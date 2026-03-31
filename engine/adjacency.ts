import { Position } from 'models';

export function isValidPath(path: Position[], boardSize: number): boolean {
  return arePositionsInBounds(path, boardSize) && hasNoRepeatedPositions(path) && isConnectedPath(path);
}

function arePositionsInBounds(path: Position[], boardSize: number): boolean {
  return path.every(pos => pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize);
}

function hasNoRepeatedPositions(path: Position[]): boolean {
  const seen = new Set(path.map((pos) => `${pos.row},${pos.col}`));
  return seen.size === path.length;
}

function isConnectedPath(path: Position[]): boolean {
  return path.every((pos, i) => i === 0 || areAdjacent(path[i - 1], pos));
}

function areAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}