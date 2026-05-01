import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Position, Game, Word } from 'models';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './shared/supabase';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useWordValidator } from './hooks/useWordValidator';
import { useFeedbackSounds } from './pages/game';
import type { FeedbackType } from './pages/game';
import type { GameResults } from './shared/types';
import { scoreWord } from './shared/utils/score';
import type { DailyInfo, DailyZenInfo, DailyZenSession } from './shared/api/gameApi';
import {
  fetchDaily,
  recordDailyResultToServer,
  fetchDailyResult,
  fetchProfile,
  updateProfile,
  fetchDailyZen,
  fetchDailyZenSession,
  submitDailyZenWord,
} from './shared/api/gameApi';
import { loadDailyResult, clearDailyResult } from './shared/utils/dailyStorage';
import { decodeSeedCode } from 'models/seedCode';
import type { GameConfig } from './pages/config';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

export type ZenModeChoice = 'competitive' | 'casual';

const loadZenModeChoice = (): ZenModeChoice => {
  try {
    const raw = localStorage.getItem('froggle-zen-mode-choice');
    return raw === 'casual' ? 'casual' : 'competitive';
  } catch { return 'competitive'; }
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

  // Zen Daily
  cachedDailyZen: DailyZenInfo | null;
  cachedDailyZenSession: DailyZenSession | null;
  dailyZenLoaded: boolean;
  setCachedDailyZenSession: (session: DailyZenSession | null) => void;
  refreshDailyZenSession: () => Promise<void>;
  /** Player's most recent zen mode choice. Used as the pre-selected
   *  default on the start-page gate; the persisted session row remains
   *  the source of truth once a day is in progress. */
  lastZenModeChoice: ZenModeChoice;
  setLastZenModeChoice: (choice: ZenModeChoice) => void;

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
  handleSubmitZenWord: (path: Position[]) => Promise<void>;

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
      .then(({ display_name }) => { if (display_name) setDisplayName(display_name); })
      .catch(() => {}); // Fall back to default 'Anonymous'
  }, [authReady]);

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Cached daily result from server
  const [cachedDailyResult, setCachedDailyResult] = useState<{ found_words: any[]; board: string[][] } | null>(null);
  const [dailyResultLoaded, setDailyResultLoaded] = useState(false);

  // Zen Daily state
  const [cachedDailyZen, setCachedDailyZen] = useState<DailyZenInfo | null>(null);
  const [cachedDailyZenSession, setCachedDailyZenSession] = useState<DailyZenSession | null>(null);
  const [dailyZenLoaded, setDailyZenLoaded] = useState(false);
  const [lastZenModeChoice, setLastZenModeChoiceState] = useState<ZenModeChoice>(loadZenModeChoice);

  const setLastZenModeChoice = useCallback((choice: ZenModeChoice) => {
    setLastZenModeChoiceState(choice);
    try { localStorage.setItem('froggle-zen-mode-choice', choice); } catch { /* ignore */ }
  }, []);

  const refreshDailyZenSession = async () => {
    if (!cachedDailyZen) return;
    try {
      const session = await fetchDailyZenSession(cachedDailyZen.date);
      setCachedDailyZenSession(session);
    } catch {
      // Network blip — keep last-known value rather than nuking the UI.
    }
  };

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
          await recordDailyResultToServer(info.date, wordStrings, localResult.board, info.config);
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

  // Fetch zen daily puzzle + any in-progress / ended session for today.
  useEffect(() => {
    if (!authReady) return;
    fetchDailyZen()
      .then(async (info) => {
        setCachedDailyZen(info);
        try {
          const session = await fetchDailyZenSession(info.date);
          setCachedDailyZenSession(session);
        } catch {
          // ignore — landing falls back to "Play"
        }
        setDailyZenLoaded(true);
      })
      .catch(() => setDailyZenLoaded(true));
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
    recordDailyResultToServer(dailyInfo.date, wordStrings, results.board, dailyInfo.config)
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

  // Single source of truth for the audio + 200ms feedback flash both modes
  // run after a submission. Outcome shape is { valid, reason? } to match
  // the server's submit response and the local validator's return type.
  const flashFeedback = useCallback(
    (path: Position[], outcome: { valid: boolean; reason?: string }) => {
      let type: FeedbackType;
      if (outcome.valid) {
        type = 'valid';
        if (!muted) playValid();
      } else if (outcome.reason === 'repeat') {
        type = 'duplicate';
        if (!muted) playDuplicate();
      } else {
        type = 'invalid';
        if (!muted) playInvalid();
      }
      setFeedback({ type, path });
      setTimeout(() => setFeedback(null), 200);
    },
    [muted, playValid, playInvalid, playDuplicate],
  );

  const handleSubmitWord = async (path: Position[]) => {
    const result = await submitWord(path);
    if (result.valid) fetchGameState();
    flashFeedback(path, result);
  };

  // Zen daily uses a separate transport (DB-backed session, no in-memory
  // game) but shares the validator + feedback machinery. Local hash lookup
  // gives instant color, then we optimistic-update the cached session and
  // fire the server submit in the background.
  const zenValidator = useWordValidator();

  useEffect(() => {
    const salt = cachedDailyZenSession?.salt ?? cachedDailyZen?.salt ?? '';
    const hashes = cachedDailyZenSession?.wordHashes ?? cachedDailyZen?.wordHashes ?? [];
    zenValidator.setSource(salt, hashes);
  }, [cachedDailyZenSession?.salt, cachedDailyZenSession?.wordHashes, cachedDailyZen?.salt, cachedDailyZen?.wordHashes, zenValidator]);

  useEffect(() => {
    zenValidator.setSubmitted(cachedDailyZenSession?.found_words ?? []);
  }, [cachedDailyZenSession?.found_words, zenValidator]);

  const handleSubmitZenWord = useCallback(
    async (path: Position[]) => {
      const session = cachedDailyZenSession;
      if (!session || session.ended_at) return;

      // Word is derived from the board the session was started against, so
      // client + server agree even if the daily-info board ever drifts (e.g.
      // user crosses midnight mid-play and a fresh fetchDailyZen returns
      // tomorrow's board).
      const word = path
        .map((p) => session.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      // If the validator isn't armed (e.g. session pre-dates the salt+hashes
      // upgrade, or the response was malformed), fall back to network-first
      // so we don't reject every word as invalid.
      if (!zenValidator.isArmed()) {
        const outcome = await submitDailyZenWord(session.date, path);
        flashFeedback(path, outcome);
        if (outcome.valid && outcome.word) {
          const score = outcome.score ?? scoreWord(outcome.word);
          const nextWords = [...session.found_words, outcome.word];
          const nextLongest = outcome.word.length > session.longest_word.length
            ? outcome.word
            : session.longest_word;
          setCachedDailyZenSession({
            ...session,
            found_words: nextWords,
            points: session.points + score,
            word_count: nextWords.length,
            longest_word: nextLongest,
          });
        }
        return;
      }

      const local = zenValidator.validate(word);
      flashFeedback(path, local);

      if (!local.valid) return;

      zenValidator.recordSubmitted(word);
      const score = scoreWord(word);
      const nextWords = [...session.found_words, word];
      const nextLongest = word.length > session.longest_word.length ? word : session.longest_word;
      setCachedDailyZenSession({
        ...session,
        found_words: nextWords,
        points: session.points + score,
        word_count: nextWords.length,
        longest_word: nextLongest,
      });

      // Server is canonical for persistence. Single retry mirrors the
      // freeplay/timed flow in useGameApi.submitWord.
      const fire = () => submitDailyZenWord(session.date, path);
      fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
    },
    [cachedDailyZenSession, zenValidator, flashFeedback],
  );

  const refreshDaily = async () => {
    const info = await fetchDaily();
    setCachedDaily(info);
    return info;
  };

  return (
    <GameContext.Provider value={{
      game, words, results, gameSeed, feedback, timeRemaining,
      dailyInfo, setDailyInfo, cachedDaily, cachedDailyResult, dailyResultLoaded, refreshDaily,
      cachedDailyZen, cachedDailyZenSession, dailyZenLoaded,
      setCachedDailyZenSession, refreshDailyZenSession,
      lastZenModeChoice, setLastZenModeChoice,
      boardCode, setBoardCode, sharedSeed, handleCodeChange,
      lastConfig, setLastConfig,
      muted, toggleMute,
      createGame, startGame, cancelGame, endGame, submitWord, handleSubmitWord, handleSubmitZenWord,
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
