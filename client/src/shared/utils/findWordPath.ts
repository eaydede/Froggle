import type { Position } from 'models';

/**
 * Finds any valid adjacency path on `board` that spells `word`. Used when
 * the server-stored daily result no longer carries per-word paths but we
 * still want to trace a word on the mini-board at view time.
 *
 * Boards are small (≤6×6) and words are short, so a plain DFS with a
 * visited set is well within budget.
 */
export function findWordPath(board: string[][], word: string): Position[] | null {
  const size = board.length;
  if (size === 0) return null;
  const target = word.toUpperCase();
  if (target.length === 0) return null;

  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const dfs = (row: number, col: number, i: number, path: Position[]): Position[] | null => {
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    if (visited[row][col]) return null;
    if ((board[row][col] ?? '').toUpperCase() !== target[i]) return null;

    const nextPath = [...path, { row, col }];
    if (i === target.length - 1) return nextPath;

    visited[row][col] = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const found = dfs(row + dr, col + dc, i + 1, nextPath);
        if (found) {
          visited[row][col] = false;
          return found;
        }
      }
    }
    visited[row][col] = false;
    return null;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const found = dfs(r, c, 0, []);
      if (found) return found;
    }
  }
  return null;
}
