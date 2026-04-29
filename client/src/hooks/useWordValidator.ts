import { useCallback, useRef } from 'react';
import { hashWord } from 'models';

export interface WordValidator {
  /** Wire up the salt + word-hash set the server pre-computed for this puzzle. */
  setSource: (salt: string, hashes: string[]) => void;
  /** Seed the already-found set on resume so duplicate detection works without a network round-trip. */
  setSubmitted: (words: string[]) => void;
  /** True once a non-empty hash set has been wired up. Callers should fall back to a network-only flow when false. */
  isArmed: () => boolean;
  /** Local, instant validation. Returns the same shape as the server submit response. */
  validate: (word: string) => { valid: boolean; reason?: 'invalid' | 'repeat' };
  /** Mark a word as found so subsequent submissions of the same word return 'repeat'. */
  recordSubmitted: (word: string) => void;
}

// Shared between freeplay/timed (via useGameApi) and zen daily. The server
// returns a salt + the FNV-hashed dictionary for the current board; the
// client hashes candidate words and looks them up before sending the path
// to the server, so color feedback is instant.
export function useWordValidator(): WordValidator {
  const hashesRef = useRef<Set<string>>(new Set());
  const saltRef = useRef('');
  const submittedRef = useRef<Set<string>>(new Set());

  const setSource = useCallback((salt: string, hashes: string[]) => {
    saltRef.current = salt;
    hashesRef.current = new Set(hashes);
  }, []);

  const setSubmitted = useCallback((words: string[]) => {
    submittedRef.current = new Set(words.map((w) => w.toUpperCase()));
  }, []);

  const validate = useCallback((word: string) => {
    const upper = word.toUpperCase();
    if (submittedRef.current.has(upper)) return { valid: false, reason: 'repeat' as const };
    const hash = hashWord(upper, saltRef.current);
    if (!hashesRef.current.has(hash)) return { valid: false, reason: 'invalid' as const };
    return { valid: true };
  }, []);

  const recordSubmitted = useCallback((word: string) => {
    submittedRef.current.add(word.toUpperCase());
  }, []);

  const isArmed = useCallback(() => hashesRef.current.size > 0 && saltRef.current !== '', []);

  return { setSource, setSubmitted, isArmed, validate, recordSubmitted };
}
