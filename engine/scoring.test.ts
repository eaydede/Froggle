import { describe, expect, it } from 'vitest';
import { scoreWord } from './scoring';

describe('scoreWord', () => {
  it('scores each length boundary on the capped Fibonacci curve', () => {
    expect(scoreWord('CAT')).toBe(1);     // 3 letters
    expect(scoreWord('CATS')).toBe(2);    // 4 letters
    expect(scoreWord('CARTS')).toBe(3);   // 5 letters
    expect(scoreWord('CARTED')).toBe(5);  // 6 letters
    expect(scoreWord('CARTING')).toBe(8); // 7 letters
    expect(scoreWord('CARTOONS')).toBe(13); // 8 letters
  });

  it('caps anything 8+ letters at 13', () => {
    expect(scoreWord('CARTOONIST')).toBe(13);    // 10 letters
    expect(scoreWord('UNCOMPLICATED')).toBe(13); // 13 letters
  });

  it('falls back to the lowest tier for inputs shorter than 3', () => {
    expect(scoreWord('AT')).toBe(1);
    expect(scoreWord('A')).toBe(1);
    expect(scoreWord('')).toBe(1);
  });
});
