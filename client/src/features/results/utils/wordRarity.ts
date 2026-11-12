export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic' | 'legendary';

/**
 * Maps a word's score to its rarity tier.
 *
 * Tiers are driven by the scoring rules (`scoreWord`):
 *   3 letters  → 1pt  → common
 *   4 letters  → 2pt  → uncommon
 *   5 letters  → 3pt  → rare
 *   6 letters  → 5pt  → epic
 *   7 letters  → 8pt  → mythic
 *   8+ letters → 13pt → legendary
 *
 * Anything outside the known rungs falls back to common so the UI
 * still renders a stripe instead of bailing.
 */
export function wordRarity(score: number): Rarity {
  if (score >= 13) return 'legendary';
  if (score >= 8) return 'mythic';
  if (score >= 5) return 'epic';
  if (score >= 3) return 'rare';
  if (score >= 2) return 'uncommon';
  return 'common';
}

export const RARITY_VAR: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  uncommon: 'var(--rarity-uncommon)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  mythic: 'var(--rarity-mythic)',
  legendary: 'var(--rarity-legendary)',
};
