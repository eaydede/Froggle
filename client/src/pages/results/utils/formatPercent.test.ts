import { describe, expect, it } from 'vitest';
import { formatPercent } from './formatPercent';

describe('formatPercent', () => {
  it('shows <1% for sub-1 values so rare finds never read as zero', () => {
    expect(formatPercent(0)).toBe('<1%');
    expect(formatPercent(0.4)).toBe('<1%');
    expect(formatPercent(0.999)).toBe('<1%');
  });

  it('shows 100% for ≥99.5 so universal finds never read as 99%', () => {
    expect(formatPercent(99.5)).toBe('100%');
    expect(formatPercent(99.9)).toBe('100%');
    expect(formatPercent(100)).toBe('100%');
  });

  it('rounds to the nearest integer in the middle band', () => {
    expect(formatPercent(1)).toBe('1%');
    expect(formatPercent(11.4)).toBe('11%');
    expect(formatPercent(11.5)).toBe('12%');
    expect(formatPercent(50)).toBe('50%');
    expect(formatPercent(99.4)).toBe('99%');
  });
});
