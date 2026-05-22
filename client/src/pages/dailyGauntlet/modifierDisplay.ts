import { HOT_LETTER_MULTIPLIER, type GauntletModifier, type GauntletRoundKind } from 'models/gauntlet';

// Single source of truth for how a round's modifier is described to the
// player. Used by the hub cards, confirm pages, the in-game overlay, and
// the post-round results so we never explain the same mechanic two
// different ways.

// Display names for each round. Internal kinds stay 'regular' /
// 'hotLetter' / 'rareLetters' so server payloads and storage are
// unchanged; only the display text shifts. Each name nods to the
// scoring rule that round actually carries: nothing extra (Standard),
// one letter pays a bonus (Bonus), or per-letter values reward rare
// finds (Bounty).
export function roundTitle(kind: GauntletRoundKind): string {
  switch (kind) {
    case 'regular': return 'Standard';
    case 'hotLetter': return 'Bonus';
    case 'rareLetters': return 'Bounty';
  }
}

export function modifierBadge(modifier: GauntletModifier): string {
  switch (modifier.kind) {
    case 'regular': return 'Standard scoring';
    case 'hotLetter': return `${modifier.letter} · ${HOT_LETTER_MULTIPLIER}×`;
    case 'rareLetters': return 'Letter values';
  }
}

export function modifierDescription(modifier: GauntletModifier): string {
  switch (modifier.kind) {
    case 'regular':
      return 'Standard length-based scoring. Find as many words as you can.';
    case 'hotLetter':
      // Generic rule — the specific letter + multiplier render in their own
      // dedicated section so the rule reads the same every day.
      return 'One letter on the board is the bonus letter. Words containing it score extra.';
    case 'rareLetters':
      return 'Each letter has its own point value. Word score is the sum of its letters — rare letters are worth more.';
  }
}

// Returns the letter-value table sorted high-to-low for display. Only
// makes sense for rareLetters; returns null otherwise.
export function letterValueTable(
  modifier: GauntletModifier,
): Array<{ letter: string; value: number }> | null {
  if (modifier.kind !== 'rareLetters') return null;
  return Object.entries(modifier.values)
    .map(([letter, value]) => ({ letter, value }))
    .sort((a, b) => b.value - a.value || a.letter.localeCompare(b.letter));
}
