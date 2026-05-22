import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RARE_LETTER_VALUES,
  type GauntletModifier,
} from 'models/gauntlet';
import { scoreGauntletWord } from './gauntletScoring';

const regular: GauntletModifier = { kind: 'regular' };
const hotE: GauntletModifier = { kind: 'hotLetter', letter: 'E' };
const rare: GauntletModifier = {
  kind: 'rareLetters',
  values: { ...DEFAULT_RARE_LETTER_VALUES },
};

describe('scoreGauntletWord', () => {
  it('regular delegates to base length scoring', () => {
    expect(scoreGauntletWord('CAT', regular)).toBe(1);
    expect(scoreGauntletWord('CARTS', regular)).toBe(3);
    expect(scoreGauntletWord('CARTING', regular)).toBe(8);
  });

  it('hot letter doubles a base score when the word contains the letter', () => {
    expect(scoreGauntletWord('CARE', hotE)).toBe(4); // base 2 × 2
    expect(scoreGauntletWord('TREES', hotE)).toBe(6); // base 3 × 2
  });

  it('hot letter leaves base score alone when the letter is absent', () => {
    expect(scoreGauntletWord('CATS', hotE)).toBe(2);
    expect(scoreGauntletWord('NIGHT', hotE)).toBe(3);
  });

  it('rare letters sums per-letter values regardless of length tiers', () => {
    expect(scoreGauntletWord('QUIZ', rare)).toBe(10 + 1 + 1 + 10);
    expect(scoreGauntletWord('JAZZ', rare)).toBe(8 + 1 + 10 + 10);
    expect(scoreGauntletWord('CARE', rare)).toBe(3 + 1 + 1 + 1);
  });

  it('rare letters treats unknown characters as zero', () => {
    const limited: GauntletModifier = { kind: 'rareLetters', values: { A: 1, B: 1 } };
    expect(scoreGauntletWord('CAB', limited)).toBe(2);
  });
});
