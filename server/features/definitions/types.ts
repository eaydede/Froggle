


// ─── Definition lookup ────────────────────────────────────────────────────
//
// Mirrors the WordDefinition shape the results page already renders
// (client/src/features/results/hooks/useDefinition.ts) so the Daily page and
// Results page can share a single component tree for definition display.

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string; }>;
  }>;
}
