import type { Position } from 'models';

export function isValidPath(path: Position[], boardSize: number): boolean {
  if (!Array.isArray(path) || !path.length) return false;
  const visited = new Set<string>();
  for (let index = 0; index < path.length; index++) {
    const position = path[index];
    if (!position || !Number.isInteger(position.row) || !Number.isInteger(position.col)) return false;
    if (position.row < 0 || position.col < 0 || position.row >= boardSize || position.col >= boardSize) return false;
    const key = `${position.row},${position.col}`;
    if (visited.has(key)) return false;
    visited.add(key);
    const previous = path[index - 1];
    if (previous && (Math.abs(previous.row - position.row) > 1 || Math.abs(previous.col - position.col) > 1)) return false;
  }
  return true;
}
