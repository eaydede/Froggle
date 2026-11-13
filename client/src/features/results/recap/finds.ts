import type { ResultPlayer } from 'models/results';

/** Some results endpoints return score-sorted words. Restore the canonical
 * find order and timing from the result record while retaining mode bonuses. */
export function buildFinds<Word extends { word: string; score: number }>(
  words: Word[],
  recorded?: ResultPlayer,
) {
  const finds = new Map(
    recorded?.finds.map((find, index) => [find.word.toUpperCase(), { ...find, index }]),
  );
  return words
    .map((word, index) => {
      const name = word.word.toUpperCase();
      const find = finds.get(name);
      return { ...word, word: name, time: find?.time ?? null, order: find?.index ?? index };
    })
    .sort((a, b) => a.order - b.order);
}
