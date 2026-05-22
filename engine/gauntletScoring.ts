import { HOT_LETTER_MULTIPLIER, type GauntletModifier } from 'models/gauntlet';
import { scoreWord } from './scoring.js';

// Per-word score under a gauntlet round's modifier.
//
//  - regular:      delegates to the standard length-tier scorer
//  - hotLetter:    base × HOT_LETTER_MULTIPLIER when the word contains the
//                  hot letter
//  - rareLetters:  sum of per-letter values, replacing length-based scoring
//
// The word string is whatever the player's path joined produced (e.g. a Qu
// tile contributes both Q and U into the joined string), so iterating
// characters here matches what the player actually sees.
export function scoreGauntletWord(word: string, modifier: GauntletModifier): number {
  const upper = word.toUpperCase();
  switch (modifier.kind) {
    case 'regular':
      return scoreWord(upper);
    case 'hotLetter': {
      const base = scoreWord(upper);
      const hot = modifier.letter.toUpperCase();
      return upper.includes(hot) ? base * HOT_LETTER_MULTIPLIER : base;
    }
    case 'rareLetters': {
      let sum = 0;
      for (const ch of upper) sum += modifier.values[ch] ?? 0;
      return sum;
    }
  }
}

export function scoreGauntletWords(words: string[], modifier: GauntletModifier): number {
  let total = 0;
  for (const w of words) total += scoreGauntletWord(w, modifier);
  return total;
}
