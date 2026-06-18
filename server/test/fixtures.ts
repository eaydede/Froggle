import { generateSeededBoard } from 'engine/board.js';
import { findAllWords, type FoundWord } from 'engine/solver.js';
import { dictionary } from '../services/dictionary.js';

export interface BoardFixture {
  board: string[][];
  /** Real findable words with their adjacency paths, sorted by length asc. */
  words: FoundWord[];
}

// Finds a deterministic seeded board that yields several real dictionary
// words of at least two distinct lengths, so tests can submit genuine
// engine-validated paths (and assert longest-word behavior) without
// hand-crafting adjacency by hand.
export function boardWithWords(size: number, minWordLength: number): BoardFixture {
  for (let seed = 1; seed < 10_000; seed++) {
    const board = generateSeededBoard(size, seed) as string[][];
    const words = findAllWords(board, dictionary, minWordLength);
    const distinctLengths = new Set(words.map((w) => w.word.length));
    if (words.length >= 3 && distinctLengths.size >= 2) {
      return {
        board,
        words: [...words].sort((a, b) => a.word.length - b.word.length),
      };
    }
  }
  throw new Error('boardWithWords: no suitable seeded board found');
}
