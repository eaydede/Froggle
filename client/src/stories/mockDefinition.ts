import type { WordDefinition } from '../pages/results/hooks/useDefinition';

// Builds a minimal valid WordDefinition for stories. Accepts a raw string so
// existing story copy can stay readable.
export function mockDefinition(word: string, text: string): WordDefinition {
  return {
    word: word.toLowerCase(),
    phonetic: undefined,
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [{ definition: text }],
      },
    ],
  };
}
