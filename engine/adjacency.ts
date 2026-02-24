import { Position } from 'models';

export function isValidPath(path: Position[]): boolean {
  return hasNoRepeatedPositions(path) && isConnectedPath(path);
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