// Word-finding for the test bench. Algorithmically identical to
// engine/solver.ts but takes a pre-built prefix set so the calibration loop
// doesn't pay 14k × 1M Set inserts.

import type { Board } from 'models';

export function buildPrefixSet(dict: Iterable<string>): Set<string> {
  const prefixes = new Set<string>();
  for (const word of dict) {
    for (let i = 1; i <= word.length; i++) prefixes.add(word.substring(0, i));
  }
  return prefixes;
}

export function findAllWords(
  board: Board,
  dict: Set<string>,
  prefixes: Set<string>,
  minLen: number,
): string[] {
  const size = board.length;
  const found = new Set<string>();
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const dfs = (r: number, c: number, word: string) => {
    const next = word + board[r][c].toLowerCase();
    if (!prefixes.has(next)) return;
    if (next.length >= minLen && dict.has(next)) found.add(next);
    visited[r][c] = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) dfs(nr, nc, next);
      }
    }
    visited[r][c] = false;
  };
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dfs(r, c, '');
  return [...found];
}
