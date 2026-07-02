import type { Position } from 'models';
import { hashWord } from 'models';
import {
  TIME_IS_MONEY_SECONDS_PER_POINT,
  goldenCell,
} from 'models/experimental';
import { scoreWord } from '../../shared/utils/score';
import { findWordPath } from '../../shared/utils/findWordPath';

// mm:ss for the Time is Money clock + time-survived stat.
export function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The banked time a Time is Money run is worth: the base clock plus a fixed
// number of seconds per point. Since the base + rate are identical for every
// player, ranking by this value is identical to ranking by points — it's purely
// a display transform.
export function timeSurvivedSeconds(baseTimeLimit: number, points: number): number {
  return baseTimeLimit + points * TIME_IS_MONEY_SECONDS_PER_POINT;
}

// Golden Ticket — does this path route through the wildcard center?
export function pathTouchesGolden(path: Position[], boardSize: number): boolean {
  const c = goldenCell(boardSize);
  return path.some((p) => p.row === c.row && p.col === c.col);
}

export interface GoldenLocalResult {
  words: { word: string; score: number }[];
  totalScore: number;
}

// Local, instant validation for a Golden Ticket submission. The server ships
// a `goldenHashes` set covering every word findable when the center is a
// wildcard, so we can enumerate the 26 blank-fills here and check each one
// against the set — no round trip needed to know which completions score.
//
// Returns null when nothing valid comes out of the enumeration; the caller
// treats that as a rejected submission (invalid path or no completions).
export function goldenCompletions({
  path,
  board,
  boardSize,
  minWordLength,
  salt,
  goldenHashes,
  foundWords,
}: {
  path: Position[];
  board: string[][];
  boardSize: number;
  minWordLength: number;
  salt: string;
  goldenHashes: Set<string>;
  foundWords: Set<string>;
}): GoldenLocalResult | null {
  if (path.length < minWordLength) return null;
  const c = goldenCell(boardSize);
  const centerIdx = path.findIndex((p) => p.row === c.row && p.col === c.col);
  if (centerIdx === -1) return null;

  const template = path.map((p) => board[p.row][p.col]);
  const words: { word: string; score: number }[] = [];
  const seen = new Set<string>();
  for (let code = 0; code < 26; code++) {
    const letter = String.fromCharCode(65 + code);
    template[centerIdx] = letter;
    const candidate = template.join('').toUpperCase();
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (foundWords.has(candidate)) continue;
    if (!goldenHashes.has(hashWord(candidate, salt))) continue;
    words.push({ word: candidate, score: scoreWord(candidate) });
  }
  if (words.length === 0) return null;
  return {
    words,
    totalScore: words.reduce((sum, w) => sum + w.score, 0),
  };
}

// Find a path for a word on a Golden Ticket board. Falls back through the two
// possible ways the word could have been found:
//
//   1. A plain path, if the word doesn't need the wildcard. The stored board
//      has the raw marker at the center, and no word contains that marker,
//      so `findWordPath` naturally routes only around the center — a hit here
//      means the player found the word without touching the wildcard.
//
//   2. A golden path, otherwise. We don't store which letter filled the
//      wildcard, so we try each A..Z at the center and take the first path
//      that succeeds *and* actually routes through the center. That path
//      identifies both the fill letter and the drawn shape.
//
// Returns `null` if neither succeeds — the results page tolerates that (the
// word list still shows the entry, the preview board just doesn't animate on
// tap, same as any daily mode with an untraceable word).
export function findGoldenWordPath(board: string[][], word: string): Position[] | null {
  const plain = findWordPath(board, word);
  if (plain) return plain;

  const center = goldenCell(board.length);
  const swapped = board.map((row) => row.slice());
  for (let code = 0; code < 26; code++) {
    swapped[center.row][center.col] = String.fromCharCode(65 + code);
    const path = findWordPath(swapped, word);
    if (!path) continue;
    const passesCenter = path.some((p) => p.row === center.row && p.col === center.col);
    if (passesCenter) return path;
  }
  return null;
}
