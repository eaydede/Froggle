import { describe, expect, it } from 'vitest';
import { extendPath, hitsTile } from './path';

describe('word tracing', () => {
  it('accepts diagonal neighbors and retracts when crossing an earlier tile', () => {
    const first = { row: 0, col: 0 }, second = { row: 1, col: 1 }, third = { row: 0, col: 1 };
    const path = [first, second, third];
    expect(extendPath([first], second)).toEqual([first, second]);
    expect(extendPath(path, first)).toEqual([first]);
  });
  it('ignores a repeated current tile and unreachable jumps', () => {
    const path = [{ row: 0, col: 0 }];
    expect(extendPath(path, path[0])).toBe(path);
    expect(extendPath(path, { row: 2, col: 0 })).toBe(path);
  });
  it('keeps the original circular hit area and rejects corners', () => {
    const tile = { left: 10, top: 10, width: 100, height: 100 };
    expect(hitsTile(60, 60, tile)).toBe(true);
    expect(hitsTile(102, 60, tile)).toBe(true);
    expect(hitsTile(103, 60, tile)).toBe(false);
    expect(hitsTile(10, 10, tile)).toBe(false);
  });
});
