import { Board, Position } from 'models';

export interface FoundWord {
  word: string;
  path: Position[];
}

export function findAllWords(board: Board, dictionary: Set<string>, minWordLength: number): FoundWord[] {
  const size = board.length;
  const results = new Map<string, Position[]>();

  // Build a prefix set for early termination
  const prefixes = new Set<string>();
  for (const word of dictionary) {
    for (let i = 1; i <= word.length; i++) {
      prefixes.add(word.substring(0, i));
    }
  }

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
