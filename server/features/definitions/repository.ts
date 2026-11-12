import type { WordDefinition } from './types.js';

function parsePrimaryApi(data: unknown): WordDefinition | null {
  const d = data as {
    word: string;
    entries?: {
      partOfSpeech: string;
      pronunciations?: { text?: string; }[];
      senses: { definition: string; examples?: string[]; }[];
    }[];
  };
  if (!d || !d.entries || d.entries.length === 0) return null;

  const phonetic = d.entries[0]?.pronunciations?.find((p) => p.text)?.text;
  const seen = new Set<string>();
  const meanings: WordDefinition['meanings'] = [];
  for (const entry of d.entries) {
    if (seen.has(entry.partOfSpeech)) continue;
    seen.add(entry.partOfSpeech);
    meanings.push({
      partOfSpeech: entry.partOfSpeech,
      definitions: entry.senses.slice(0, 2).map((s) => ({
        definition: s.definition,
        example: s.examples?.[0],
      })),
    });
  }
  return { word: d.word, phonetic, meanings };
}

function parseFallbackApi(data: unknown): WordDefinition | null {
  const arr = data as {
    word: string;
    phonetic?: string;
    phonetics?: { text?: string; }[];
    meanings: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string; }[];
    }[];
  }[];
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const entry = arr[0];
  return {
    word: entry.word,
    phonetic: entry.phonetic || entry.phonetics?.find((p) => p.text)?.text,
    meanings: entry.meanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 2).map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
    })),
  };
}

export async function findDefinition(word: string): Promise<WordDefinition | null> {
  try {
    const res = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const parsed = parsePrimaryApi(await res.json());
      if (parsed) return parsed;
    }
  } catch {
    // Primary failed or timed out; fall through to the backup.
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) return parseFallbackApi(await res.json());
  } catch {
    // Both APIs failed — treat the word as undefinable.
  }

  return null;
}
