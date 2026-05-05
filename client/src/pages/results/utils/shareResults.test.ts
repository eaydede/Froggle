import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateShareText } from './shareResults';
import type { ScoredWord } from '../../../shared/types';

// generateShareText reads window.location.origin for daily-mode links.
// Stub it for the daily tests; restore between cases so unit tests stay
// independent.
afterEach(() => {
  vi.unstubAllGlobals();
});

const word = (w: string, score: number): ScoredWord => ({ word: w, score, path: [] });

describe('generateShareText', () => {
  it('emits the expected emoji square for every score tier', () => {
    const words: ScoredWord[] = [
      word('CAT', 1),
      word('CATS', 2),
      word('CARTS', 3),
      word('CARTED', 5),
      word('CARTING', 8),
      word('CARTOONS', 13),
    ];

    const out = generateShareText(words, { gameLink: 'http://x.test/g' });
    const lines = out.split('\n');

    // Header, longest, six emoji lines (one per tier in score order), link.
    expect(lines).toEqual([
      'Froggle 6W 32pts',
      '⭐ 8 letters ⭐',
      '⬜', // 1pt
      '🟨', // 2pt
      '🟩', // 3pt
      '🟦', // 5pt
      '🟪', // 8pt
      '🟧', // 13pt
      'http://x.test/g',
    ]);
  });

  it('repeats the emoji once per word and skips empty tiers', () => {
    // Three 1-pt words and two 5-pt words; tiers 2/3/8/13 are empty and
    // should not produce blank lines.
    const words: ScoredWord[] = [
      word('CAT', 1), word('DOG', 1), word('OWL', 1),
      word('CARTED', 5), word('SAILED', 5),
    ];

    const out = generateShareText(words, { gameLink: 'http://x.test/g' });
    const lines = out.split('\n');

    expect(lines).toContain('⬜⬜⬜');
    expect(lines).toContain('🟦🟦');
    expect(lines).not.toContain('🟨'); // no 2pt words
    expect(lines).not.toContain('🟪'); // no 8pt words
  });

  it('compacts counts above 10 into a digit-emoji prefix', () => {
    // 12 one-point words exceeds the inline-repeat ceiling.
    const words = Array(12).fill(null).map(() => word('CAT', 1));

    const out = generateShareText(words, { gameLink: 'http://x.test/g' });

    expect(out).toContain('1️⃣2️⃣ - ⬜');
    expect(out).not.toContain('⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜');
  });

  it('formats daily timed and zen headers + links distinctly', () => {
    vi.stubGlobal('window', { location: { origin: 'http://daily.test' } });

    const words = [word('CARTOONS', 13)];

    const timed = generateShareText(words, { daily: { number: 42, mode: 'timed' } });
    expect(timed).toContain('Froggle #42 1W 13pts');
    expect(timed).toContain('http://daily.test/daily');

    const zen = generateShareText(words, { daily: { number: 42, mode: 'zen' } });
    expect(zen).toContain('Froggle Zen #42 1W 13pts');
    expect(zen).toContain('http://daily.test/daily/zen/play');
  });

  it('omits the longest-word line when there are no words', () => {
    const out = generateShareText([], { gameLink: 'http://x.test/g' });
    const lines = out.split('\n');

    expect(lines[0]).toBe('Froggle 0W 0pts');
    expect(lines).not.toContain(expect.stringContaining('letters'));
  });
});
