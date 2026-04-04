import { useState, useEffect, useRef } from 'react';

interface Definition {
  definition: string;
  example?: string;
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Meaning[];
}

const cache = new Map<string, WordDefinition | null>();

function parsePrimaryApi(data: unknown): WordDefinition | null {
  const d = data as { word: string; entries?: { partOfSpeech: string; pronunciations?: { text?: string }[]; senses: { definition: string; examples?: string[] }[] }[] };
  if (!d || !d.entries || d.entries.length === 0) return null;

  const phonetic = d.entries[0]?.pronunciations?.find((p) => p.text)?.text;
  const seen = new Set<string>();
  const meanings: Meaning[] = [];
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
  const arr = data as { word: string; phonetic?: string; phonetics?: { text?: string }[]; meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[] }[];
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

async function fetchWithTimeout(url: string, signal: AbortSignal, timeoutMs: number): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Abort if either the external signal or the timeout fires
  const onAbort = () => timeoutController.abort();
  signal.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, { signal: timeoutController.signal });
    return res;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

async function fetchDefinition(word: string, signal: AbortSignal): Promise<WordDefinition | null> {
  // Try primary API with 5s timeout
  try {
    const res = await fetchWithTimeout(
      `https://freedictionaryapi.com/api/v1/entries/en/${word}`,
      signal,
      5000,
    );
    if (res.ok) {
      const data = await res.json();
      const result = parsePrimaryApi(data);
      if (result) return result;
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError' && signal.aborted) throw err;
    // Primary failed, try fallback
  }

  // Fallback API
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    { signal },
  );
  if (res.ok) {
    const data = await res.json();
    return parseFallbackApi(data);
  }
  return null;
}

export const useDefinition = (word: string | null) => {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!word) {
      setDefinition(null);
      setLoading(false);
      return;
    }

    const lower = word.toLowerCase();

    if (cache.has(lower)) {
      setDefinition(cache.get(lower)!);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    fetchDefinition(lower, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        cache.set(lower, result);
        setDefinition(result);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        cache.set(lower, null);
        setDefinition(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [word]);

  return { definition, loading };
};
