import { createContext, useCallback, useContext, useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { GameState, type Position, type Game, type Word } from 'models';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './shared/supabase';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useWordValidator } from './hooks/useWordValidator';
import { useFeedbackSounds } from './pages/game';
import type { FeedbackType } from './pages/game';
import type { GameResults } from './shared/types';
import { scoreWord } from './shared/utils/score';
import type {
  DailyInfo,
  DailyTimedSession,
  DailyZenMeta,
  DailyZenSession,
  ProfileResponse,
  UpdateProfileResult,
} from './shared/api/gameApi';
import {
  endDailyTimedSession,
  fetchDaily,
  fetchDailyResult,
  fetchDailyTimedSession,
  fetchDailyZenMeta,
  fetchDailyZenSession,
  fetchProfile,
  submitDailyTimedWord,
  submitDailyZenWord,
  updateProfile,
} from './shared/api/gameApi';
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
  /** Server-authoritative timed-daily session row. Null until the player
   *  starts (or resumes) today's puzzle. The `ended_at` field is the
   *  source of truth for whether the run has been finalized — both
   *  /game and /daily/results gate on it. */
  cachedDailyTimedSession: DailyTimedSession | null;
  setCachedDailyTimedSession: (session: DailyTimedSession | null) => void;
  /** Game state synthesized from the daily session row so the shared
   *  /game presenter can render daily mode without a parallel UI. */
  dailyGame: Game | null;
  dailyTimeRemaining: number;
  handleSubmitDailyWord: (path: Position[]) => Promise<void>;
  endDailyGame: () => Promise<void>;

  // Zen Daily
  cachedDailyZen: DailyZenMeta | null;
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
  nameProfile: ProfileResponse | null;
  updateDisplayName: (name: string) => Promise<UpdateProfileResult>;
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
  const [nameProfile, setNameProfile] = useState<ProfileResponse | null>(null);

  const applyProfile = (profile: ProfileResponse) => {
    setNameProfile(profile);
    setDisplayName(profile.display_name || 'Anonymous');
  };

  const updateDisplayName = async (name: string): Promise<UpdateProfileResult> => {
    const result = await updateProfile(name);
    if (result.ok) applyProfile(result.profile);
    return result;
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
      .then((profile) => applyProfile(profile))
      .catch(() => {}); // Fall back to default 'Anonymous'
  }, [authReady]);

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Cached daily result from server (finalized session, post end_at)
  const [cachedDailyResult, setCachedDailyResult] = useState<{ found_words: any[]; board: string[][] } | null>(null);
  const [dailyResultLoaded, setDailyResultLoaded] = useState(false);
  const [cachedDailyTimedSession, setCachedDailyTimedSession] = useState<DailyTimedSession | null>(null);

  // Zen Daily state
  const [cachedDailyZen, setCachedDailyZen] = useState<DailyZenMeta | null>(null);
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

  // Fetch public daily puzzle data immediately. It does not need auth, so
  // starting it before anonymous sign-in removes one startup waterfall from
  // the landing splash.
  useEffect(() => {
    let cancelled = false;
    fetchDaily()
      .then((info) => {
        if (!cancelled) setCachedDaily(info);
      })
      .catch(() => {
        if (!cancelled) setDailyResultLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the user's daily session + finalized result once auth and the
  // public daily are both available. The session row handles mid-game
  // resume after a reload (same as zen daily); the result row is what
  // unlocks the "See result" affordance on the confirm page.
  useEffect(() => {
    if (!authReady || !cachedDaily) return;
    let cancelled = false;
    setDailyResultLoaded(false);

    (async () => {
      const [result, session] = await Promise.all([
        fetchDailyResult(cachedDaily.date).catch(() => null),
        fetchDailyTimedSession(cachedDaily.date).catch(() => null),
      ]);
      if (cancelled) return;
      if (result) setCachedDailyResult(result);
      setCachedDailyTimedSession(session);
      setDailyResultLoaded(true);
    })().catch(() => {
      if (!cancelled) setDailyResultLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, cachedDaily]);

  // Fetch public zen puzzle data immediately. The authenticated session row
  // is loaded separately below once auth is ready.
  useEffect(() => {
    let cancelled = false;
    fetchDailyZenMeta()
      .then((info) => {
        if (!cancelled) setCachedDailyZen(info);
      })
      .catch(() => {
        if (!cancelled) setDailyZenLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady || !cachedDailyZen) return;
    let cancelled = false;
    setDailyZenLoaded(false);

    fetchDailyZenSession(cachedDailyZen.date)
      .then((session) => {
        if (!cancelled) setCachedDailyZenSession(session);
      })
      .catch(() => {
        // ignore — landing falls back to "Play"
      })
      .finally(() => {
        if (!cancelled) setDailyZenLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, cachedDailyZen]);

  // Once the timed daily session is finalized (player called /end or the
  // server auto-finalized on timeout), prime cachedDailyResult so the
  // confirm page flips to "See result" without an extra round-trip.
  useEffect(() => {
    if (!cachedDailyTimedSession?.ended_at) return;
    if (cachedDailyResult) return;
    setCachedDailyResult({
      found_words: cachedDailyTimedSession.found_words,
      board: cachedDailyTimedSession.board,
    });
  }, [cachedDailyTimedSession?.ended_at, cachedDailyTimedSession?.found_words, cachedDailyTimedSession?.board, cachedDailyResult]);

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
    const salt = cachedDailyZenSession?.salt ?? '';
    const hashes = cachedDailyZenSession?.wordHashes ?? [];
    zenValidator.setSource(salt, hashes);
  }, [cachedDailyZenSession?.salt, cachedDailyZenSession?.wordHashes, zenValidator]);

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

  // Timed daily uses the same hash + optimistic-UI pattern as zen. The
  // server is canonical for persistence and enforces both dictionary
  // validity (the salted hashes only cover legal words) and the time
  // limit (submissions past started_at + timeLimit + grace are rejected
  // as 'expired'). Words found locally that the server rejects show as
  // valid for the play instant but never appear in the persisted result.
  const dailyValidator = useWordValidator();

  useEffect(() => {
    const salt = cachedDailyTimedSession?.salt ?? '';
    const hashes = cachedDailyTimedSession?.wordHashes ?? [];
    dailyValidator.setSource(salt, hashes);
  }, [cachedDailyTimedSession?.salt, cachedDailyTimedSession?.wordHashes, dailyValidator]);

  useEffect(() => {
    dailyValidator.setSubmitted(cachedDailyTimedSession?.found_words ?? []);
  }, [cachedDailyTimedSession?.found_words, dailyValidator]);

  const handleSubmitDailyWord = useCallback(
    async (path: Position[]) => {
      const session = cachedDailyTimedSession;
      if (!session || session.ended_at) return;

      const word = path
        .map((p) => session.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      if (!dailyValidator.isArmed()) {
        const outcome = await submitDailyTimedWord(session.date, path);
        flashFeedback(path, outcome);
        if (outcome.valid && outcome.word) {
          const score = outcome.score ?? scoreWord(outcome.word);
          const nextWords = [...session.found_words, outcome.word];
          const nextLongest = outcome.word.length > session.longest_word.length
            ? outcome.word
            : session.longest_word;
          setCachedDailyTimedSession({
            ...session,
            found_words: nextWords,
            points: session.points + score,
            word_count: nextWords.length,
            longest_word: nextLongest,
          });
        }
        return;
      }

      const local = dailyValidator.validate(word);
      flashFeedback(path, local);
      if (!local.valid) return;

      dailyValidator.recordSubmitted(word);
      const score = scoreWord(word);
      const nextWords = [...session.found_words, word];
      const nextLongest = word.length > session.longest_word.length ? word : session.longest_word;
      setCachedDailyTimedSession({
        ...session,
        found_words: nextWords,
        points: session.points + score,
        word_count: nextWords.length,
        longest_word: nextLongest,
      });

      const fire = () => submitDailyTimedWord(session.date, path);
      fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
    },
    [cachedDailyTimedSession, dailyValidator, flashFeedback],
  );

  // Synthesize a Game-shaped object from the persisted session so the
  // shared /game presenter can render daily mode without a parallel UI.
  // The status flip from InProgress → Finished is driven by ended_at,
  // which the server sets when the timer elapses or /end is called.
  const dailyGame: Game | null = useMemo(() => {
    if (!cachedDailyTimedSession) return null;
    return {
      board: cachedDailyTimedSession.board,
      startedAt: new Date(cachedDailyTimedSession.started_at).getTime(),
      status: cachedDailyTimedSession.ended_at ? GameState.Finished : GameState.InProgress,
      config: {
        durationSeconds: cachedDailyTimedSession.time_limit,
        boardSize: cachedDailyTimedSession.board.length,
        minWordLength: cachedDaily?.config.minWordLength ?? 3,
      },
    };
  }, [cachedDailyTimedSession, cachedDaily?.config.minWordLength]);

  const endDailyGame = useCallback(async () => {
    if (!cachedDailyTimedSession || cachedDailyTimedSession.ended_at) return;
    const ended = await endDailyTimedSession(cachedDailyTimedSession.date);
    if (ended) setCachedDailyTimedSession(ended);
  }, [cachedDailyTimedSession]);

  // Local clock-derived timer for daily mode. When it hits 0 we fire
  // endDailyGame so the server-side row gets finalized; the server
  // also enforces the limit independently, so a missed /end call still
  // gets cleaned up on the next read.
  const dailyTimeRemaining = useTimer(dailyGame, endDailyGame);

  const refreshDaily = async () => {
    const info = await fetchDaily();
    setCachedDaily(info);
    return info;
  };

  return (
    <GameContext.Provider value={{
      game, words, results, gameSeed, feedback, timeRemaining,
      dailyInfo, setDailyInfo, cachedDaily, cachedDailyResult, dailyResultLoaded, refreshDaily,
      cachedDailyTimedSession, setCachedDailyTimedSession,
      dailyGame, dailyTimeRemaining, handleSubmitDailyWord, endDailyGame,
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
      displayName, nameProfile, updateDisplayName,
    }}>
      <div data-theme={theme} className="contents">
        {children}
      </div>
    </GameContext.Provider>
  );
}
