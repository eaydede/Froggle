import { Board, Position } from 'models';

export interface FoundWord {
  word: string;
  path: Position[];
}

// Prefix-set cache. The prefix set is a pure function of the dictionary
// (~1M string inserts for the standard ~170k-word list), so building it once
// per dictionary instance and reusing it saves that cost on every subsequent
// solve. Keyed by the dictionary Set itself — WeakMap lets the cache release
// automatically if a dictionary is ever swapped out. This is the single
// biggest cost inside the Golden Ticket solve, which runs findAllWords 26x.
const prefixCache = new WeakMap<Set<string>, Set<string>>();

function getPrefixes(dictionary: Set<string>): Set<string> {
  const cached = prefixCache.get(dictionary);
  if (cached) return cached;
  const prefixes = new Set<string>();
  for (const word of dictionary) {
    for (let i = 1; i <= word.length; i++) {
      prefixes.add(word.substring(0, i));
    }
  }
  prefixCache.set(dictionary, prefixes);
  return prefixes;
}

export function findAllWords(board: Board, dictionary: Set<string>, minWordLength: number): FoundWord[] {
  const size = board.length;
  const results = new Map<string, Position[]>();

  const prefixes = getPrefixes(dictionary);

  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const dfs = (row: number, col: number, currentWord: string, path: Position[]) => {
    const letter = board[row][col].toLowerCase();
    const newWord = currentWord + letter;
    const newPath = [...path, { row, col }];

    if (!prefixes.has(newWord)) return;

    if (newWord.length >= minWordLength && dictionary.has(newWord) && !results.has(newWord)) {
      results.set(newWord, [...newPath]);
    }

    visited[row][col] = true;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size && !visited[newRow][newCol]) {
          dfs(newRow, newCol, newWord, newPath);
        }
      }
    }

    visited[row][col] = false;
  };

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      dfs(row, col, '', []);
    }
  }

  return Array.from(results.entries()).map(([word, path]) => ({ word: word.toUpperCase(), path }));
}
