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

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lower}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return;

        if (!data || !Array.isArray(data) || data.length === 0) {
          cache.set(lower, null);
          setDefinition(null);
          setLoading(false);
          return;
        }

        const entry = data[0];
        const result: WordDefinition = {
          word: entry.word,
          phonetic: entry.phonetic || entry.phonetics?.find((p: { text?: string }) => p.text)?.text,
          meanings: entry.meanings.map((m: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.slice(0, 2).map((d) => ({
              definition: d.definition,
              example: d.example,
            })),
          })),
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
