import type { Position } from 'models';

export function extendPath(path: Position[], cell: Position): Position[] {
  const last = path[path.length - 1];
  if (!last) return [cell];
  if (last.row === cell.row && last.col === cell.col) return path;
  if (Math.abs(last.row - cell.row) > 1 || Math.abs(last.col - cell.col) > 1) return path;
  const previous = path.findIndex(position => position.row === cell.row && position.col === cell.col);
  return previous < 0 ? [...path, cell] : path.slice(0, previous + 1);
}

export function hitsTile(x: number, y: number, tile: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): boolean {
  const dx = x - tile.left - tile.width / 2;
  const dy = y - tile.top - tile.height / 2;
  return Math.hypot(dx, dy) <= tile.width * 0.85 / 2;
}
