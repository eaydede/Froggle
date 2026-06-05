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
  fetchActiveFreePlaySession,
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

// How often a foregrounded tab refetches the public daily/zen puzzle data, so a
// tab left open across the midnight rollover updates without a reload. This
// refresh swaps cached data only — it never checks the build ID, so it can
// never trigger a page reload (that stays gated to focus/visibility events).
const DAILY_CACHE_REFRESH_MS = 90_000;

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

  // The challenge the current in-flight free-play game belongs to.
  // Set when starting via a shared link so the post-game flow can
  // redirect into the challenge results view; cleared by cancelGame
  // and after a successful redirect.
  activeChallengeId: string | null;
  setActiveChallengeId: (id: string | null) => void;

  // Audio
  muted: boolean;
  toggleMute: () => void;

  // Actions
  createGame: () => Promise<void>;
  startGame: (timeLimit: number, boardSize: number, minWordLength: number, board?: string[][], seed?: number, challengeId?: string, isDaily?: boolean) => Promise<any>;
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

  // True once the server-resume probe for an in-progress free-play row
  // has settled. Routes that would otherwise bounce a null-game user
  // away from /game should wait for this before redirecting so a
  // mid-game refresh doesn't strand the player on the landing screen.
  freePlayHydrated: boolean;

  // Lets a route-local timed run (e.g. a gauntlet round, whose session
  // lives outside this context) suppress the stale-tab build-mismatch
  // reload while its timer is live, so a deploy mid-run can't reload the
  // page out from under the player. Call on mount of the live run and
  // invoke the returned unregister fn on teardown.
  registerActiveTimedRun: () => () => void;

  // Profile
  displayName: string;
  /** True once the initial profile fetch has settled (resolved or failed),
   *  so `displayName` reflects the saved name rather than the 'Anonymous'
   *  default. Consumers that bake the name in at a one-shot moment (e.g.
   *  opening a multiplayer socket, which doesn't redial on name change)
   *  should wait on this rather than `authReady`. */
  profileReady: boolean;
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
  const { game, words, results, gameSeed, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord, hydrate } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [muted, setMuted] = useState(loadMuted);
  const [dailyInfo, setDailyInfo] = useState<DailyInfo | null>(null);
  const [cachedDaily, setCachedDaily] = useState<DailyInfo | null>(null);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
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
  const [profileReady, setProfileReady] = useState(false);
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
      .catch(() => {}) // Fall back to default 'Anonymous'
      .finally(() => setProfileReady(true));
  }, [authReady]);

  // Resume an in-progress free-play game from server state when the user
  // refreshes mid-play. Mirrors the daily-timed session-fetch pattern:
  // GameProvider mounts → anonymous auth completes → we ask the server
  // whether the caller has an unfinished row and rehydrate React state
  // from it, so the existing /game route + timer pick up where they left
  // off.
  //
  // The fetch runs exactly once per mount, gated on authReady. Stashing
  // hydrate + game into refs lets the .then closure read the latest
  // values without putting them in the effect dep array — which would
  // otherwise cause the effect to re-run on every render and have its
  // cleanup cancel the in-flight resume.
  //
  // freePlayHydrated stays false until this fetch settles, so route
  // components that would otherwise bounce a null-game user away from
  // /game can hold the redirect until we know whether there's a session
  // to resume.
  const [freePlayHydrated, setFreePlayHydrated] = useState(false);
  const hydrateAttemptedRef = useRef(false);
  const hydrateRef = useRef(hydrate);
  const gameRef = useRef(game);
  useEffect(() => {
    hydrateRef.current = hydrate;
    gameRef.current = game;
  });
  useEffect(() => {
    if (!authReady || hydrateAttemptedRef.current) return;
    hydrateAttemptedRef.current = true;
    fetchActiveFreePlaySession()
      .then((session) => {
        if (session && !gameRef.current) {
          hydrateRef.current({
            game: session.game,
            foundWords: session.found_words,
            salt: session.salt,
            wordHashes: session.wordHashes,
            seed: session.seed,
          });
          if (session.challenge_id) setActiveChallengeId(session.challenge_id);
        }
      })
      .catch(() => {
        // Network blip or 401 — the user just won't get a resume. Better
        // than crashing the app at boot.
      })
      .finally(() => {
        setFreePlayHydrated(true);
      });
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
    setCachedDailyResult(null);

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

  // Mobile browsers freeze backgrounded tabs (bfcache) and resume them with
  // their old in-memory state — yesterday's daily, an outdated JS bundle, etc.
  // Two mechanisms keep a tab current. A slow interval refetches the public
  // puzzles so the board/landing match today even when a tab sits foregrounded
  // across the midnight rollover (which fires no visibility/focus event); it
  // swaps cached data only and never reloads. Separately, on return-to-tab
  // transitions (focus, visibility change, pageshow) we also compare the
  // server's build ID against the one we booted with and reload a stale bundle.
  // The reload lives only on those transitions — never on the interval — so a
  // deploy can't reload a page out from under a user sitting on it. Both passes
  // are suppressed while a timed daily run is live so they can't swap the board
  // or reload mid-run.
  const baselineBuildIdRef = useRef<string | null>(null);
  const gameStatusRef = useRef<GameState | null>(null);
  useEffect(() => {
    gameStatusRef.current = game?.status ?? null;
  }, [game]);

  // True while a timed daily run is live (started, not yet finalized). The
  // freshness pass below must bail out entirely when this is set — see the
  // guard in checkFreshness. Any future timed daily variant (e.g. a gauntlet)
  // should OR its in-progress session in here so it gets the same protection.
  const timedDailyInProgressRef = useRef(false);
  useEffect(() => {
    timedDailyInProgressRef.current =
      !!cachedDailyTimedSession && !cachedDailyTimedSession.ended_at;
  }, [cachedDailyTimedSession]);

  // Ref-counted registry for route-local timed runs (gauntlet rounds) that
  // need the reload suppressed but keep their session outside this context.
  // A count (not a boolean) so overlapping registrants — and React's
  // StrictMode double-invoke in dev — can't prematurely clear the guard.
  const activeTimedRunsRef = useRef(0);
  const registerActiveTimedRun = useCallback(() => {
    activeTimedRunsRef.current += 1;
    return () => {
      activeTimedRunsRef.current -= 1;
    };
  }, []);

  useEffect(() => {
    fetch('/api/version')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.buildId === 'string') baselineBuildIdRef.current = d.buildId;
      })
      .catch(() => {});

    // Benign refetch of the public daily/zen puzzles so the board and landing
    // match today. It only swaps cached data — it never reloads — so it is safe
    // to run on a timer. Suppressed while a timed daily is live: swapping
    // cachedDaily re-runs the session-fetch effect and around midnight loads
    // tomorrow's empty session, so GameRoute sees no active game and bounces the
    // player home mid-run.
    const refreshDailyCaches = () => {
      if (timedDailyInProgressRef.current) return;
      fetchDaily()
        .then((info) => setCachedDaily(info))
        .catch(() => {});
      fetchDailyZenMeta()
        .then((info) => setCachedDailyZen(info))
        .catch(() => {});
    };

    const checkFreshness = () => {
      if (document.hidden) return;
      if (timedDailyInProgressRef.current) return;

      refreshDailyCaches();

      // Don't reload out from under an in-progress run: free play (tracked
      // here via game.status) or a route-local timed run such as a gauntlet
      // round (tracked via the registry). The cache refetch above is harmless
      // to both, so only the version reload is gated here.
      if (gameStatusRef.current === GameState.InProgress || activeTimedRunsRef.current > 0) return;
      fetch('/api/version')
        .then((r) => r.json())
        .then((d) => {
          const next = typeof d?.buildId === 'string' ? d.buildId : null;
          const baseline = baselineBuildIdRef.current;
          if (baseline && next && next !== baseline) {
            window.location.reload();
          }
        })
        .catch(() => {});
    };

    const onVisibility = () => {
      if (!document.hidden) checkFreshness();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkFreshness();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('pageshow', onPageShow);

    // Catch a tab that stays foregrounded across the midnight rollover and so
    // never fires a transition event. Data refresh only — no build-ID check, so
    // it can never reload the page. Costs nothing while hidden.
    const dailyCachePoll = window.setInterval(() => {
      if (document.hidden) return;
      refreshDailyCaches();
    }, DAILY_CACHE_REFRESH_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.clearInterval(dailyCachePoll);
    };
  }, []);

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
      activeChallengeId, setActiveChallengeId,
      muted, toggleMute,
      createGame, startGame, cancelGame, endGame, submitWord, handleSubmitWord, handleSubmitZenWord,
      showHomeConfirm, setShowHomeConfirm,
      theme, toggleTheme,
      session, authReady,
      freePlayHydrated,
      registerActiveTimedRun,
      displayName, profileReady, nameProfile, updateDisplayName,
    }}>
      <div data-theme={theme} className="contents">
        {children}
      </div>
    </GameContext.Provider>
  );
}
