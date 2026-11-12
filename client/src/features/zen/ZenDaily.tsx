import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useDailyWordSubmission } from '../../gameplay/useDailyWordSubmission';
import { useSubmissionFeedback } from '../../gameplay/useSubmissionFeedback';
import { useRunActivity } from '../../platform/lifecycle/RunActivity';
import { readSetting, writeSetting } from '../../platform/storage';
import { useIdentity } from '../identity/Identity';
import { usePreferences } from '../preferences/Preferences';
import { endDailyZenSession, fetchDailyZenMeta, fetchDailyZenSession, submitDailyZenWord, type DailyZenMeta, type DailyZenSession } from './api';

export type ZenModeChoice = 'competitive' | 'casual';
function useZenPuzzle() {
  const { authReady } = useIdentity();
  const { muted } = usePreferences();
  const { isActive } = useRunActivity();
  const [puzzle, setPuzzle] = useState<DailyZenMeta | null>(null);
  const [run, setRun] = useState<DailyZenSession | null>(null);
  const [ready, setReady] = useState(false);
  const [choice, setChoiceState] = useState<ZenModeChoice>(() => readSetting('froggle-zen-mode-choice') === 'casual' ? 'casual' : 'competitive');
  const { feedback, flashFeedback } = useSubmissionFeedback(muted);
  const setChoice = useCallback((next: ZenModeChoice) => {
    setChoiceState(next);
    writeSetting('froggle-zen-mode-choice', next);
  }, []);
  const refreshPuzzle = useCallback(async () => {
    const next = await fetchDailyZenMeta();
    if (!isActive()) setPuzzle(next);
    return next;
  }, [isActive]);
  useEffect(() => {
    let current = true;
    fetchDailyZenMeta().then(next => { if (current) setPuzzle(next); }).catch(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (!authReady || !puzzle) return;
    let current = true;
    setReady(false);
    fetchDailyZenSession(puzzle.date).then(next => { if (current) setRun(next); })
      .catch(() => { }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, [authReady, puzzle?.date]);
  const refreshRun = useCallback(async () => {
    if (!puzzle) return;
    try { setRun(await fetchDailyZenSession(puzzle.date)); } catch { /* Retain the last saved run during a connection failure. */ }
  }, [puzzle?.date]);
  const { submitWord, settle } = useDailyWordSubmission(run, setRun, submitDailyZenWord, flashFeedback);
  const endRun = useCallback(async () => {
    if (!run) return;
    await settle();
    const ended = await endDailyZenSession(run.date);
    if (ended) setRun(ended);
  }, [run?.date, settle]);
  return { puzzle, run, setRun, ready, choice, setChoice, refreshPuzzle, refreshRun, feedback, submitWord, endRun };
}
const Context = createContext<ReturnType<typeof useZenPuzzle> | null>(null);
export function ZenDailyProvider({ children }: { children: ReactNode; }) {
  const value = useZenPuzzle();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useZenDaily() {
  const value = useContext(Context);
  if (!value) throw new Error('ZenDailyProvider is missing');
  return value;
}
