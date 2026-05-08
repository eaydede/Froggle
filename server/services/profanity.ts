import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
} from 'obscenity';

// Words missing from the upstream English dataset that we want flagged.
// All patterns require word boundaries on both sides so common compounds
// (Walnuts, Snowballs, Football, Peanuts, Boneroni, etc.) stay clean.
const extendedDataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .addPhrase((p) => p.setMetadata({ originalWord: 'balls' }).addPattern(pattern`|balls|`))
  .addPhrase((p) => p.setMetadata({ originalWord: 'nuts' }).addPattern(pattern`|nuts|`))
  .addPhrase((p) => p.setMetadata({ originalWord: 'boner' }).addPattern(pattern`|boner|`));

const matcher = new RegExpMatcher({
  ...extendedDataset.build(),
  ...englishRecommendedTransformers,
});

// Many patterns in the dataset (e.g. cock, ass, tit, fag, piss) require word
// boundaries to avoid false positives like "peacock" or "Scunthorpe". CamelCase
// compounds like "BadAss" lowercase to "badass", which has no boundary between
// the two words — so the pattern misses. Splitting at case transitions restores
// the boundary so the matcher can see them.
function splitCamelCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// Letter-by-letter obfuscations like "D I C K", "D.I.C.K", "F U C K" defeat
// the matcher because the separators leave each letter as its own token.
// Remove a separator only when the characters on both sides are isolated
// single letters — initials like "J.K. Rowling", "A B Smith", or "U.S. Army"
// stay intact because the surrounding tokens aren't part of a longer letter run.
function collapseSpacedLetters(name: string): string {
  return name.replace(/(?<![A-Za-z])([A-Za-z])[\s._\-]+(?=[A-Za-z](?![A-Za-z]))/g, '$1');
}

export function containsProfanity(name: string): boolean {
  if (typeof name !== 'string') return false;
  if (matcher.hasMatch(name)) return true;
  const split = splitCamelCase(name);
  if (split !== name && matcher.hasMatch(split)) return true;
  const collapsed = collapseSpacedLetters(name);
  return collapsed !== name && matcher.hasMatch(collapsed);
}
