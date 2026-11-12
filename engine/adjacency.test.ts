import { describe, expect, it } from 'vitest';
import type { Position } from 'models';
import { isValidPath } from './adjacency.js';

describe('path integrity', () => {
  it('allows edge and diagonal connections without reusing a tile', () => {
    expect(isValidPath([{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], 4)).toBe(true);
    expect(isValidPath([{ row: 0, col: 0 }, { row: 0, col: 0 }], 4)).toBe(false);
    expect(isValidPath([{ row: 0, col: 0 }, { row: 2, col: 1 }], 4)).toBe(false);
  });
  it('rejects malformed, fractional, empty and out-of-bounds paths', () => {
    for (const path of [null, [], [null], [{ row: 0.5, col: 0 }], [{ row: '0', col: 0 }], [{ row: 4, col: 0 }]]) {
      expect(isValidPath(path as unknown as Position[], 4)).toBe(false);
    }
  });
});
