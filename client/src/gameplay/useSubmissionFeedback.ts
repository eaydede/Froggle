import type { Position } from 'models';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedbackType } from './components/Board';
import { useFeedbackSounds } from './hooks/useFeedbackSounds';

export interface SubmissionFeedback { type: FeedbackType; path: Position[]; }

export function useSubmissionFeedback(muted: boolean) {
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(clearTimer.current), []);
  const flashFeedback = useCallback((path: Position[], outcome: { valid: boolean; reason?: string; }) => {
    const type = outcome.valid ? 'valid' : outcome.reason === 'repeat' ? 'duplicate' : 'invalid';
    if (!muted) {
      if (type === 'valid') playValid();
      else if (type === 'duplicate') playDuplicate();
      else playInvalid();
    }
    clearTimeout(clearTimer.current);
    setFeedback({ type, path });
    clearTimer.current = setTimeout(() => setFeedback(null), 200);
  }, [muted, playValid, playInvalid, playDuplicate]);
  return { feedback, flashFeedback };
}
