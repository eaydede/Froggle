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

    fetch(`https://freedictionaryapi.com/api/v1/entries/en/${lower}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!data || !data.entries || data.entries.length === 0) {
          cache.set(lower, null);
          setDefinition(null);
          setLoading(false);
          return;
        }

        const phonetic = data.entries[0]?.pronunciations?.find(
          (p: { text?: string }) => p.text
        )?.text;

        // Group entries by part of speech, deduplicating
        const seen = new Set<string>();
        const meanings: Meaning[] = [];
        for (const entry of data.entries) {
          if (seen.has(entry.partOfSpeech)) continue;
          seen.add(entry.partOfSpeech);
          meanings.push({
            partOfSpeech: entry.partOfSpeech,
            definitions: entry.senses.slice(0, 2).map((s: { definition: string; examples?: string[] }) => ({
              definition: s.definition,
              example: s.examples?.[0],
            })),
          });
        }

        const result: WordDefinition = {
          word: data.word,
          phonetic,
          meanings,
        };

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
