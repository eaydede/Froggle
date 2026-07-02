import type { Board, Position } from 'models';
import { findAllWords } from './solver.js';

// Enumerates every word findable on the given board *when the center cell is
// treated as a wildcard*. For each candidate letter A..Z we swap it into the
// center and run the normal solver, then keep only the words whose path
// actually routes through the center — that's what makes the word "golden".
//
// Runs 26 solves on the same board, all small (≤5x5 in practice). This is
// authoritative for both:
//   • what a golden path can legally complete (server enforcement + client
//     goldenHashes for instant local validation)
//   • the "state space" for a future golden-aware missed-words tab
//
// Words that don't touch the center are excluded — those are covered by the
// normal `findAllWords` on a board whose center holds the raw GOLDEN_TILE
// marker (no dictionary word contains that character, so those paths self-
// exclude).
export interface GoldenWord {
  word: string;
  /** The path from the run that produced this word — center cell included. */
  path: Position[];
  /** The letter that filled the center for this completion. */
  goldenLetter: string;
}

// Targeted DFS: does `word` have at least one Boggle path on `board` that
// includes the center cell? Returns the first such path found, or null.
// Used as a fallback when `findAllWords` returned a path that avoided the
// center (findAllWords keeps only one path per word — the first one its DFS
// hits — so an off-center path can shadow an equally valid center-passing
// one, which would otherwise silently drop the word from the golden set).
function findPathThroughCenter(
  board: Board,
  word: string,
  center: { row: number; col: number },
): Position[] | null {
  const size = board.length;
  const target = word.toUpperCase();
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const dfs = (
    row: number,
    col: number,
    i: number,
    path: Position[],
    hitCenter: boolean,
  ): Position[] | null => {
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    if (visited[row][col]) return null;
    if ((board[row][col] ?? '').toUpperCase() !== target[i]) return null;

    const nowHit = hitCenter || (row === center.row && col === center.col);
    const nextPath = [...path, { row, col }];

    if (i === target.length - 1) return nowHit ? nextPath : null;

    visited[row][col] = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const found = dfs(row + dr, col + dc, i + 1, nextPath, nowHit);
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
      const found = dfs(r, c, 0, [], false);
      if (found) return found;
    }
  }
  return null;
}

export function findAllGoldenWords(
  board: Board,
  dictionary: Set<string>,
  minWordLength: number,
  center: { row: number; col: number },
): GoldenWord[] {
  const results = new Map<string, GoldenWord>();

  for (let code = 0; code < 26; code++) {
    const letter = String.fromCharCode(65 + code);
    const swapped = board.map((row, r) =>
      row.map((cell, c) => (r === center.row && c === center.col ? letter : cell)),
    );
    const found = findAllWords(swapped, dictionary, minWordLength);
    for (const { word, path } of found) {
      if (results.has(word)) continue;
      const passesCenter = path.some((p) => p.row === center.row && p.col === center.col);
      if (passesCenter) {
        results.set(word, { word, path, goldenLetter: letter });
        continue;
      }
      // Fallback: findAllWords returned a path that avoided the center. Do
      // one targeted search that requires the path to pass through center —
      // if such a path exists, this word IS reachable by drawing through the
      // wildcard, and belongs in the golden set.
      const centerPath = findPathThroughCenter(swapped, word, center);
      if (centerPath) {
        results.set(word, { word, path: centerPath, goldenLetter: letter });
      }
    }
  }

  return Array.from(results.values());
}
