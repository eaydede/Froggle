// Encodes board state + config into a compact shareable code
// Uses base36 for simplicity and readability (0-9, A-Z)

const BOARD_SIZES = [4, 5, 6];
const TIME_LIMITS = [60, 120, -1];
const MIN_WORD_LENGTHS = [3, 4, 5];

export interface SharedBoard {
  board: string[][];
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

export function encodeBoard(data: SharedBoard): string {
  const sizeIdx = BOARD_SIZES.indexOf(data.boardSize);
  const timeIdx = TIME_LIMITS.indexOf(data.timeLimit);
  const lenIdx = MIN_WORD_LENGTHS.indexOf(data.minWordLength);

  // Config: single base36 char encodes sizeIdx*9 + timeIdx*3 + lenIdx (max 2*9+2*3+2=26 < 36)
  const configVal = sizeIdx * 9 + timeIdx * 3 + lenIdx;
  const configChar = configVal.toString(36).toUpperCase();

  // Each letter A-Z maps to A-Z (already base26, represent as A-Z directly)
  const letters: string[] = [];
  for (let r = 0; r < data.boardSize; r++) {
    for (let c = 0; c < data.boardSize; c++) {
      letters.push(data.board[r][c].toUpperCase());
    }
  }

  return configChar + letters.join('');
}

export function decodeBoard(code: string): SharedBoard | null {
  try {
    if (code.length < 2) return null;

    const configChar = code[0];
    const configVal = parseInt(configChar, 36);
    if (isNaN(configVal)) return null;

    const sizeIdx = Math.floor(configVal / 9);
    const timeIdx = Math.floor((configVal % 9) / 3);
    const lenIdx = configVal % 3;

    if (sizeIdx >= BOARD_SIZES.length || timeIdx >= TIME_LIMITS.length || lenIdx >= MIN_WORD_LENGTHS.length) return null;

    const boardSize = BOARD_SIZES[sizeIdx];
    const totalCells = boardSize * boardSize;
    const letterStr = code.slice(1).toUpperCase();

    if (letterStr.length !== totalCells) return null;

    // Validate all A-Z
    if (!/^[A-Z]+$/.test(letterStr)) return null;

    const board: string[][] = [];
    let idx = 0;
    for (let r = 0; r < boardSize; r++) {
      const row: string[] = [];
      for (let c = 0; c < boardSize; c++) {
        row.push(letterStr[idx++]);
      }
      board.push(row);
    }

    return {
      board,
      boardSize,
      timeLimit: TIME_LIMITS[timeIdx],
      minWordLength: MIN_WORD_LENGTHS[lenIdx],
    };
  } catch {
    return null;
  }
}

export function formatCode(code: string): string {
  // Add dashes for readability every 4-5 chars
  if (code.length <= 5) return code;
  const parts: string[] = [];
  for (let i = 0; i < code.length; i += 5) {
    parts.push(code.slice(i, i + 5));
  }
  return parts.join('-');
}

export function parseCode(formatted: string): string {
  return formatted.replace(/-/g, '').toUpperCase();
}
