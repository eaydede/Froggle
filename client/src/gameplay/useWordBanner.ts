import type { Position } from 'models';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedbackType } from './components/Board';

export interface WordFeedback { type: FeedbackType; path: Position[]; bonus?: string | null; }

export function useWordBanner(board: string[][], feedback: WordFeedback | null) {
  const [displayWord, setWord] = useState('');
  const [wordFeedback, setType] = useState<FeedbackType>(null);
  const [isFading, setFading] = useState(false);
  const [wordBonus, setBonus] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  const handleCurrentWordChange = useCallback((word: string) => {
    if (!word) return;
    clearTimers();
    setWord(word);
    setType(null);
    setBonus(null);
    setFading(false);
  }, [clearTimers]);
  useEffect(() => {
    if (!feedback) return;
    clearTimers();
    setWord(feedback.path.map(position => board[position.row]?.[position.col] ?? '').join(''));
    setType(feedback.type);
    setBonus(feedback.bonus ?? null);
    setFading(false);
    timers.current.push(setTimeout(() => {
      setFading(true);
      timers.current.push(setTimeout(() => {
        setWord(''); setType(null); setBonus(null); setFading(false);
      }, 300));
    }, 800));
  }, [board, feedback, clearTimers]);
  return { displayWord, wordFeedback, isFading, wordBonus, handleCurrentWordChange };
}
