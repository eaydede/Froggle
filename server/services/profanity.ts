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

export function containsProfanity(name: string): boolean {
  if (typeof name !== 'string') return false;
  if (matcher.hasMatch(name)) return true;
  const split = splitCamelCase(name);
  return split !== name && matcher.hasMatch(split);
}
