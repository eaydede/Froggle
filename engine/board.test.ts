import { describe, expect, it } from 'vitest';
import { generateBoard, generateSeededBoard } from './board';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const BACKBONES = new Set(['T', 'S', 'R', 'N', 'L', 'D']);
const OTHERS = new Set(['B', 'C', 'F', 'G', 'H', 'J', 'K', 'M', 'P', 'Qu', 'V', 'W', 'X', 'Y', 'Z']);

// Expected per-board V/B/O counts. These are the H8 contract — the model
// guarantees exact quotas on every board. Drift here is a real regression.
const QUOTAS: Record<number, { V: number; B: number; O: number }> = {
  4: { V: 5, B: 7, O: 4 },
  5: { V: 10, B: 9, O: 6 },
  6: { V: 13, B: 14, O: 9 },
};

function categorize(board: string[][]): { V: number; B: number; O: number } {
  let V = 0, B = 0, O = 0;
  for (const row of board) {
    for (const cell of row) {
      if (VOWELS.has(cell)) V++;
      else if (BACKBONES.has(cell)) B++;
      else O++;
    }
  }
  return { V, B, O };
}

describe('generateBoard', () => {
  for (const size of [4, 5, 6] as const) {
    describe(`${size}×${size}`, () => {
      it('returns a 2D grid of the correct shape', () => {
        const board = generateBoard(size);
        expect(board.length).toBe(size);
        for (const row of board) expect(row.length).toBe(size);
      });

      it('honors V/B/O quotas exactly on every board', () => {
        // Quotas are exact (not probabilistic) — run many samples, every
        // single one must match. 50 is plenty for an invariant check.
        for (let i = 0; i < 50; i++) {
          const board = generateBoard(size);
          expect(categorize(board)).toEqual(QUOTAS[size]);
        }
      });

      it('only emits letters from the three configured pools', () => {
        const allowed = new Set([...VOWELS, ...BACKBONES, ...OTHERS]);
        for (let i = 0; i < 20; i++) {
          const board = generateBoard(size);
          for (const row of board) {
            for (const cell of row) {
              expect(allowed.has(cell)).toBe(true);
            }
          }
        }
      });
    });
  }

  it('defaults to 4×4 when no size is provided', () => {
    const board = generateBoard();
    expect(board.length).toBe(4);
    expect(categorize(board)).toEqual(QUOTAS[4]);
  });
});

describe('generateSeededBoard', () => {
  it('produces an identical board for the same seed', () => {
    for (const size of [4, 5, 6]) {
      const a = generateSeededBoard(size, 12345);
      const b = generateSeededBoard(size, 12345);
      expect(a).toEqual(b);
    }
  });

  it('produces different boards for different seeds', () => {
    // mulberry32 is well-distributed; adjacent seeds reliably diverge.
    const a = generateSeededBoard(5, 1);
    const b = generateSeededBoard(5, 2);
    expect(a).not.toEqual(b);
  });

  it('honors V/B/O quotas exactly under seeded generation', () => {
    for (const size of [4, 5, 6] as const) {
      // A handful of arbitrary seeds — quotas hold deterministically too.
      for (const seed of [1, 42, 12345, 999999, 0xDEADBEEF]) {
        const board = generateSeededBoard(size, seed);
        expect(categorize(board)).toEqual(QUOTAS[size]);
      }
    }
  });
});
