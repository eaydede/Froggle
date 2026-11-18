import { readFileSync } from 'node:fs';

let frequencies: Map<string, number> | undefined;

export function getVocabulary(): ReadonlyMap<string, number> {
  if (!frequencies) {
    const contents = readFileSync(new URL('./data/wordfreq-en.tsv', import.meta.url), 'utf8');
    frequencies = new Map(contents.trim().split('\n').map(line => {
      const [word, frequency] = line.split('\t');
      return [word, Number(frequency)];
    }));
  }
  return frequencies;
}
