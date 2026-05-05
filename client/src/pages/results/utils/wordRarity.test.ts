import { describe, expect, it } from 'vitest';
import { wordRarity, RARITY_VAR } from './wordRarity';

describe('wordRarity', () => {
  it('maps every score the engine produces to its tier', () => {
    expect(wordRarity(1)).toBe('common');
    expect(wordRarity(2)).toBe('uncommon');
    expect(wordRarity(3)).toBe('rare');
    expect(wordRarity(5)).toBe('epic');
    expect(wordRarity(8)).toBe('mythic');
    expect(wordRarity(13)).toBe('legendary');
  });

  it('falls back to common for unknown low scores', () => {
    expect(wordRarity(0)).toBe('common');
  });

  it('treats arbitrary high scores as legendary', () => {
    // Defensive check — if a future scoring change pushes past 13,
    // those words still light up the top tier instead of dropping
    // to a lower one.
    expect(wordRarity(20)).toBe('legendary');
    expect(wordRarity(100)).toBe('legendary');
  });
});

describe('RARITY_VAR', () => {
  it('has a CSS-var entry for every tier', () => {
    // Guards against adding a tier in one place and forgetting the other —
    // RARITY_VAR is what every consumer indexes into for the stripe color.
    const tiers = ['common', 'uncommon', 'rare', 'epic', 'mythic', 'legendary'] as const;
    for (const tier of tiers) {
      expect(RARITY_VAR[tier]).toMatch(/^var\(--rarity-/);
    }
  });
});
