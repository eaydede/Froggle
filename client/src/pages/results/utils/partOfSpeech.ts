// Abbreviations for common parts of speech, used in both the preview
// card (short) and the sheet meta line (slightly longer). The dictionary
// APIs we consume already return lowercase English names like "noun" /
// "verb" / "adjective"; anything unknown falls through unchanged.

const SHORT: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
  determiner: 'det.',
  article: 'art.',
  exclamation: 'excl.',
  abbreviation: 'abbr.',
};

export function abbreviatePartOfSpeech(pos: string): string {
  const key = pos.trim().toLowerCase();
  return SHORT[key] ?? pos;
}
