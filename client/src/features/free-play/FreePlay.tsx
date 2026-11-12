import { GameState, type Game, type Position, type Word } from 'models';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameResults } from '../../gameplay/types';
import { useSubmissionFeedback } from '../../gameplay/useSubmissionFeedback';
import { useWordValidator } from '../../gameplay/useWordValidator';
import { useRunActivity } from '../../platform/lifecycle/RunActivity';
import { useTimer } from '../../platform/time/useTimer';
import { useIdentity } from '../identity/Identity';
import { usePreferences } from '../preferences/Preferences';
import * as api from './api';

function useFreePlaySession() {
  const { authReady } = useIdentity();
  const { muted } = usePreferences();
  const { registerActiveRun } = useRunActivity();
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [results, setResults] = useState<GameResults | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const validator = useWordValidator();
  const { feedback, flashFeedback } = useSubmissionFeedback(muted);
  const currentGame = useRef(game);
  currentGame.current = game;
  const pendingWrites = useRef(new Set<Promise<unknown>>());
  const pendingResults = useRef<Promise<void> | null>(null);

  const loadResults = useCallback(() => {
    if (!pendingResults.current) {
      pendingResults.current = api.fetchResults().then(setResults).finally(() => { pendingResults.current = null; });
    }
    return pendingResults.current;
  }, []);
  const reset = useCallback(() => {
    validator.setSource('', []);
    validator.setSubmitted([]);
    setWords([]);
    setResults(null);
    setSeed(null);
    setChallengeId(null);
  }, [validator.setSource, validator.setSubmitted]);

  useEffect(() => {
    if (!authReady) return;
    let current = true;
    api.fetchActiveFreePlaySession().then(session => {
      if (!current || !session || currentGame.current) return;
      setGame(session.game);
      setWords(session.found_words.map(word => ({ word, path: [], submittedAt: 0 })));
      setSeed(session.seed);
      setChallengeId(session.challenge_id);
      validator.setSource(session.salt, session.wordHashes);
      validator.setSubmitted(session.found_words);
    }).catch(() => { }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, [authReady, validator.setSource, validator.setSubmitted]);
  useEffect(() => {
    if (game?.status === GameState.InProgress) return registerActiveRun();
  }, [game?.status, registerActiveRun]);

  const createGame = useCallback(async () => {
    const created = await api.createGame();
    reset();
    setGame(created.game);
  }, [reset]);
  const startGame = useCallback(async (
    durationSeconds = 180, boardSize = 4, minWordLength = 3,
    board?: string[][], boardSeed?: number, nextChallengeId?: string, isDaily?: boolean,
  ) => {
    const started = await api.startGame(durationSeconds, boardSize, minWordLength, board, boardSeed, nextChallengeId, isDaily);
    reset();
    validator.setSource(started.salt, started.wordHashes);
    setGame(started.game);
    setSeed(started.seed);
    setChallengeId(nextChallengeId ?? null);
  }, [reset, validator.setSource]);
  const cancelGame = useCallback(async () => {
    await api.cancelGame();
    reset();
    setGame(null);
  }, [reset]);
  const endGame = useCallback(async () => {
    await Promise.allSettled([...pendingWrites.current]);
    const ended = await api.endGame();
    setGame(ended.game);
    await loadResults();
  }, [loadResults]);
  const refreshGame = useCallback(async () => {
    const state = await api.fetchGameState();
    setGame(state.game);
    setWords(state.words);
    if (state.game?.status === GameState.Finished) await loadResults();
  }, [loadResults]);
  const submitWord = useCallback(async (path: Position[]) => {
    const active = currentGame.current;
    if (!active || active.status !== GameState.InProgress) return { valid: false, reason: 'invalid' };
    const word = path.map(position => active.board[position.row]?.[position.col] ?? '').join('').toUpperCase();
    const outcome = validator.validate(word);
    flashFeedback(path, outcome);
    if (outcome.valid) {
      validator.recordSubmitted(word);
      setWords(previous => [...previous, { word, path, submittedAt: Date.now() }]);
    }
    const send = () => api.submitWord(path);
    const pending = send().catch(() => new Promise(resolve => {
      setTimeout(() => { send().then(resolve).catch(() => resolve(null)); }, 200);
    })).finally(() => pendingWrites.current.delete(pending));
    pendingWrites.current.add(pending);
    return { ...outcome, word };
  }, [validator.validate, validator.recordSubmitted, flashFeedback]);
  const timeRemaining = useTimer(game, refreshGame);
  return {
    game, words, results, seed, challengeId, setChallengeId, ready, feedback, timeRemaining,
    createGame, startGame, cancelGame, endGame, submitWord
  };
}
const Context = createContext<ReturnType<typeof useFreePlaySession> | null>(null);
export function FreePlayProvider({ children }: { children: ReactNode; }) {
  const value = useFreePlaySession();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useFreePlay() {
  const value = useContext(Context);
  if (!value) throw new Error('FreePlayProvider is missing');
  return value;
}
