import { GameState, type Game } from 'models';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDailyWordSubmission } from '../../gameplay/useDailyWordSubmission';
import { useSubmissionFeedback } from '../../gameplay/useSubmissionFeedback';
import { useRunActivity } from '../../platform/lifecycle/RunActivity';
import { toDeviceClock } from '../../platform/time/serverClock';
import { useTimer } from '../../platform/time/useTimer';
import { useIdentity } from '../identity/Identity';
import { usePreferences } from '../preferences/Preferences';
import {
  endDailyTimedSession, fetchDaily, fetchDailyResult, fetchDailyTimedSession, submitDailyTimedWord,
  type DailyInfo,
  type DailyResultResponse,
  type DailyTimedSession
} from './api';

function useTimedPuzzle() {
  const { authReady } = useIdentity();
  const { muted } = usePreferences();
  const { registerActiveRun, isActive } = useRunActivity();
  const [puzzle, setPuzzle] = useState<DailyInfo | null>(null);
  const [selectedPuzzle, selectPuzzle] = useState<DailyInfo | null>(null);
  const [run, setRun] = useState<DailyTimedSession | null>(null);
  const [result, setResult] = useState<Pick<DailyResultResponse, 'found_words' | 'board'> | null>(null);
  const [ready, setReady] = useState(false);
  const { feedback, flashFeedback } = useSubmissionFeedback(muted);

  const refreshPuzzle = useCallback(async () => {
    const next = await fetchDaily();
    if (!isActive()) setPuzzle(next);
    return next;
  }, [isActive]);
  useEffect(() => {
    let current = true;
    fetchDaily().then(next => { if (current) setPuzzle(next); }).catch(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (!authReady || !puzzle) return;
    let current = true;
    setReady(false);
    setResult(null);
    Promise.all([
      fetchDailyResult(puzzle.date).catch(() => null),
      fetchDailyTimedSession(puzzle.date).catch(() => null),
    ]).then(([finished, session]) => {
      if (!current) return;
      setResult(finished);
      setRun(session);
      setReady(true);
    });
    return () => { current = false; };
  }, [authReady, puzzle?.date]);

  useEffect(() => {
    if (run && !run.ended_at) return registerActiveRun();
  }, [run?.date, run?.ended_at, registerActiveRun]);
  useEffect(() => {
    if (run?.ended_at) setResult({ found_words: run.found_words, board: run.board });
  }, [run]);

  const { submitWord, settle } = useDailyWordSubmission(run, setRun, submitDailyTimedWord, flashFeedback);
  const endRun = useCallback(async () => {
    if (!run || run.ended_at) return;
    await settle();
    const ended = await endDailyTimedSession(run.date);
    if (ended) setRun(ended);
  }, [run?.date, run?.ended_at, settle]);
  const game = useMemo<Game | null>(() => run ? {
    board: run.board,
    startedAt: toDeviceClock(new Date(run.started_at).getTime(), run.clock_offset_ms ?? 0),
    status: run.ended_at ? GameState.Finished : GameState.InProgress,
    config: { durationSeconds: run.time_limit, boardSize: run.board.length, minWordLength: puzzle?.config.minWordLength ?? 3 },
  } : null, [run, puzzle?.config.minWordLength]);
  const timeRemaining = useTimer(game, endRun);
  return { puzzle, selectedPuzzle, selectPuzzle, run, setRun, result, ready, refreshPuzzle, game, timeRemaining, submitWord, endRun, feedback };
}
const Context = createContext<ReturnType<typeof useTimedPuzzle> | null>(null);
export function TimedDailyProvider({ children }: { children: ReactNode; }) {
  const value = useTimedPuzzle();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTimedDaily() {
  const value = useContext(Context);
  if (!value) throw new Error('TimedDailyProvider is missing');
  return value;
}
