import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Position, Game, Word } from 'models';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './shared/supabase';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './pages/game';
import type { FeedbackType } from './pages/game';
import type { GameResults } from './shared/types';
import type { DailyInfo } from './shared/api/gameApi';
import { fetchDaily, recordDailyResultToServer, fetchDailyResult, fetchProfile, updateProfile } from './shared/api/gameApi';
import { loadDailyResult, clearDailyResult } from './shared/utils/dailyStorage';
import { decodeSeedCode } from 'models/seedCode';
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
  cachedDailyResult: { found_words: string[]; board: string[][] } | null;
  dailyResultLoaded: boolean;
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

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Auth
  session: Session | null;
  authReady: boolean;

  // Profile
  displayName: string;
  updateDisplayName: (name: string) => Promise<void>;
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('froggle-theme') as 'light' | 'dark') || 'light';
    } catch { return 'light'; }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('froggle-theme', next); } catch { /* ignore */ }
      return next;
    });
  };

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState('Anonymous');

  const updateDisplayName = async (name: string) => {
    setDisplayName(name);
    await updateProfile(name);
  };

  const authInitRef = useRef(false);

  useEffect(() => {
    if (authInitRef.current) return;
    authInitRef.current = true;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setAuthReady(true);
      } else {
        // No session — sign in anonymously
        supabase.auth.signInAnonymously().then(({ data: { session } }) => {
          setSession(session);
          setAuthReady(true);
        }).catch((err) => {
          console.warn('Anonymous sign-in failed:', err);
          setAuthReady(true); // Continue without auth
        });
      }
    });

    // Listen for auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load display name from server after auth is ready
  useEffect(() => {
    if (!authReady) return;
    fetchProfile()
      .then(({ display_name }) => setDisplayName(display_name))
      .catch(() => {}); // Fall back to default 'Anonymous'
  }, [authReady]);

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Cached daily result from server
  const [cachedDailyResult, setCachedDailyResult] = useState<{ found_words: any[]; board: string[][] } | null>(null);
  const [dailyResultLoaded, setDailyResultLoaded] = useState(false);

  // Fetch today's daily info + result on mount (wait for auth to be ready)
  // Also migrates any localStorage daily result to the server (one-time bridge for existing users)
  useEffect(() => {
    if (!authReady) return;
    fetchDaily().then(async (info) => {
      setCachedDaily(info);
      // Check if user has already played today
      try {
        const result = await fetchDailyResult(info.date);
        if (result) {
          setCachedDailyResult(result);
          setDailyResultLoaded(true);
          return;
        }
      } catch {
        // No server result yet — fall through to localStorage check
      }

      // Migration: if localStorage has a result for today, upload it to the server
      const localResult = loadDailyResult(info.date);
      if (localResult) {
        const wordStrings = localResult.foundWords.map(w => w.word);
        try {
          await recordDailyResultToServer(info.date, wordStrings, localResult.board);
          setCachedDailyResult({ found_words: wordStrings, board: localResult.board });
          // Clean up localStorage now that the result is persisted on the server
          clearDailyResult(info.date);
        } catch (err) {
          console.warn('Failed to migrate localStorage daily result to server:', err);
        }
      }
      setDailyResultLoaded(true);
    }).catch(() => setDailyResultLoaded(true));
  }, [authReady]);

  // Record daily results when a daily game is completed in the current session.
  // Skips if the result for this date has already been cached (either from a prior
  // server fetch or from a successful record earlier in this session), which also
  // prevents false positives when `results` holds state from an unrelated game.
  useEffect(() => {
    if (!dailyInfo || !results) return;
    if (cachedDailyResult) return;

    // Only record if the game that produced these results actually matches today's daily board.
    const resultsFlat = results.board.flat().join(',');
    const expectedFlat = dailyInfo.board.flat().join(',');
    if (resultsFlat !== expectedFlat) return;

    const wordStrings = results.foundWords.map(w => w.word);
    recordDailyResultToServer(dailyInfo.date, wordStrings, results.board)
      .then(() => {
        setCachedDailyResult({ found_words: wordStrings, board: results.board });
      })
      .catch((err) => {
        console.warn('Failed to record daily result to server:', err);
      });
  }, [dailyInfo, results, cachedDailyResult]);

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
      dailyInfo, setDailyInfo, cachedDaily, cachedDailyResult, dailyResultLoaded, refreshDaily,
      boardCode, setBoardCode, sharedSeed, handleCodeChange,
      lastConfig, setLastConfig,
      muted, toggleMute,
      createGame, startGame, cancelGame, endGame, submitWord, handleSubmitWord,
      showHomeConfirm, setShowHomeConfirm,
      theme, toggleTheme,
      session, authReady,
      displayName, updateDisplayName,
    }}>
      <div data-theme={theme} className="contents">
        {children}
      </div>
    </GameContext.Provider>
  );
}
