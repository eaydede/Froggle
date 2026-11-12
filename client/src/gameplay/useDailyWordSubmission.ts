import type { Position } from 'models';
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { scoreWord } from './score';
import { useWordValidator } from './useWordValidator';

interface WordSession {
  date: string;
  board: string[][];
  found_words: string[];
  ended_at: string | null;
  points: number;
  word_count: number;
  longest_word: string;
  salt: string;
  wordHashes: string[];
}
interface Outcome { valid: boolean; word?: string; score?: number; reason?: string; }

// Timed and untimed dailies share the same acceptance contract. Timers,
// start/end workflows and mode choices remain owned by the calling feature.
export function useDailyWordSubmission<T extends WordSession>(
  session: T | null,
  setSession: Dispatch<SetStateAction<T | null>>,
  persist: (date: string, path: Position[]) => Promise<Outcome>,
  showFeedback: (path: Position[], outcome: Outcome) => void,
) {
  const validator = useWordValidator();
  const pending = useRef(new Set<Promise<unknown>>());
  const settle = useCallback(async () => { await Promise.allSettled([...pending.current]); }, []);
  const active = useRef(session);
  active.current = session;
  useEffect(() => { validator.setSource(session?.salt ?? '', session?.wordHashes ?? []); }, [session?.salt, session?.wordHashes, validator.setSource]);
  useEffect(() => { validator.setSubmitted(session?.found_words ?? []); }, [session?.found_words, validator.setSubmitted]);

  const submitWord = useCallback(async (path: Position[]) => {
    const run = active.current;
    if (!run || run.ended_at) return;
    const word = path.map(position => run.board[position.row]?.[position.col] ?? '').join('').toUpperCase();
    const local = validator.isArmed();
    const outcome: Outcome = local ? validator.validate(word) : await persist(run.date, path);
    showFeedback(path, outcome);
    if (!outcome.valid) return;
    const accepted = outcome.word ?? word;
    validator.recordSubmitted(accepted);
    setSession(previous => {
      if (!previous || previous.date !== run.date || previous.ended_at || previous.found_words.includes(accepted)) return previous;
      return {
        ...previous,
        found_words: [...previous.found_words, accepted],
        points: previous.points + (outcome.score ?? scoreWord(accepted)),
        word_count: previous.found_words.length + 1,
        longest_word: accepted.length > previous.longest_word.length ? accepted : previous.longest_word,
      };
    });
    if (local) {
      const write = persist(run.date, path).catch(() => new Promise(resolve => {
        setTimeout(() => { persist(run.date, path).then(resolve).catch(() => resolve(null)); }, 200);
      })).finally(() => pending.current.delete(write));
      pending.current.add(write);
    }
  }, [persist, setSession, showFeedback, validator.isArmed, validator.validate, validator.recordSubmitted]);
  return { submitWord, settle };
}
