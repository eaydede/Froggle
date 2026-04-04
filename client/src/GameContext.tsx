import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Position, Game, Word } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './pages/game';
import type { FeedbackType } from './pages/game';
import type { GameResults } from './shared/types';
import type { DailyInfo } from './shared/api/gameApi';
import { fetchDaily } from './shared/api/gameApi';
import { decodeSeedCode } from 'models/seedCode';
import { recordDailyResult } from './shared/utils/dailyStorage';
import type { GameConfig } from './pages/config';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

interface GameContextValue {
  // Game state
  game: Game | null;
  words: Word[];
  results: GameResults | null;
  gameSeed: number | null;
  feedback: { type: FeedbackType; path: Position[] } | null;
  timeRemaining: number;

  // Daily
  dailyInfo: DailyInfo | null;
  setDailyInfo: (info: DailyInfo | null) => void;
  cachedDaily: DailyInfo | null;
  refreshDaily: () => Promise<DailyInfo>;

  // Board code
  boardCode: string;
  setBoardCode: (code: string) => void;
  sharedSeed: { boardSize: number; seed: number } | null;
  handleCodeChange: (code: string) => void;

  // Config persistence
  lastConfig: GameConfig | null;
  setLastConfig: (config: GameConfig | null) => void;

  // Audio
  muted: boolean;
  toggleMute: () => void;

  // Actions
  createGame: () => Promise<void>;
  startGame: (timeLimit: number, boardSize: number, minWordLength: number, board?: string[][], seed?: number) => Promise<any>;
  cancelGame: () => Promise<void>;
  endGame: () => Promise<void>;
  submitWord: (path: Position[]) => Promise<any>;
  handleSubmitWord: (path: Position[]) => Promise<void>;

  // Confirm modal
  showHomeConfirm: boolean;
  setShowHomeConfirm: (show: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { game, words, results, gameSeed, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [muted, setMuted] = useState(loadMuted);
  const [dailyInfo, setDailyInfo] = useState<DailyInfo | null>(null);
  const [cachedDaily, setCachedDaily] = useState<DailyInfo | null>(null);
  const [boardCode, setBoardCode] = useState('');
  const [sharedSeed, setSharedSeed] = useState<{ boardSize: number; seed: number } | null>(null);
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Fetch today's daily info on mount
  useEffect(() => {
    fetchDaily().then(setCachedDaily).catch(() => {});
  }, []);

  // Record daily results when they become available
  const hasRecordedRef = useRef(false);
  useEffect(() => {
    if (!dailyInfo || !results || hasRecordedRef.current) return;

    const resultsFlat = results.board.flat().join(',');
    const expectedFlat = dailyInfo.board.flat().join(',');
    if (resultsFlat !== expectedFlat) {
      console.warn('Daily board mismatch — results not recorded');
      return;
    }

    recordDailyResult(dailyInfo.date, dailyInfo.number, results.foundWords, results.missedWords, results.board);
    hasRecordedRef.current = true;
  }, [dailyInfo, results]);

  // Reset recording flag when dailyInfo changes
  useEffect(() => {
    hasRecordedRef.current = false;
  }, [dailyInfo]);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem('froggle-muted', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleCodeChange = (code: string) => {
    setBoardCode(code);
    if (code.length === 14) {
      const decoded = decodeSeedCode(code);
      setSharedSeed(decoded || null);
    } else {
      setSharedSeed(null);
    }
  };

  const handleSubmitWord = async (path: Position[]) => {
    const result = await submitWord(path);

    let feedbackType: FeedbackType;
    if (result.valid) {
      feedbackType = 'valid';
      if (!muted) playValid();
      fetchGameState();
    } else if (result.reason === 'repeat') {
      feedbackType = 'duplicate';
      if (!muted) playDuplicate();
    } else {
      feedbackType = 'invalid';
      if (!muted) playInvalid();
    }

    setFeedback({ type: feedbackType, path });
    setTimeout(() => setFeedback(null), 200);
  };

  const refreshDaily = async () => {
    const info = await fetchDaily();
    setCachedDaily(info);
    return info;
  };

  return (
    <GameContext.Provider value={{
      game, words, results, gameSeed, feedback, timeRemaining,
      dailyInfo, setDailyInfo, cachedDaily, refreshDaily,
      boardCode, setBoardCode, sharedSeed, handleCodeChange,
      lastConfig, setLastConfig,
      muted, toggleMute,
      createGame, startGame, cancelGame, endGame, submitWord, handleSubmitWord,
      showHomeConfirm, setShowHomeConfirm,
    }}>
      {children}
    </GameContext.Provider>
  );
}
