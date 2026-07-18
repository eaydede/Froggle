import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameState, type Game, type Position } from 'models';
import {
  EXPERIMENTAL_MODES,
  TIME_IS_MONEY_SECONDS_PER_POINT,
  goldenCell,
  type ExperimentalModeKey,
} from 'models/experimental';
import { useGame } from '../../GameContext';
import { GamePage } from '../game/GamePage';
import { useFeedbackSounds, type FeedbackType } from '../game';
import { useTimer } from '../../hooks/useTimer';
import { useWordValidator } from '../../hooks/useWordValidator';
import { scoreWord } from '../../shared/utils/score';
import type { CellDecoration } from '../game/components/Board';
import { OverflowTimerBar } from './components/OverflowTimerBar';
import { GoldenTileOverlay } from './components/GoldenTileOverlay';
import { GoldenReveal } from './components/GoldenReveal';
import {
  goldenCompletions,
  pathTouchesGolden,
  type GoldenLocalResult,
} from './experimentalUtils';
import {
  endExperimentalSession,
  fetchExperimentalSession,
  submitExperimentalWord,
  type ExperimentalSession,
} from '../../shared/api/dailyExperimentalApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

// Reveal is shown for the total stagger + hold + fade of the GoldenReveal
// component. Kept in sync with the component's internal timings so a rapid
// series of golden draws doesn't queue up behind an old reveal.
const GOLDEN_REVEAL_DURATION_MS = 2400;

// Plays one experimental mode. Follows the gauntlet play-route shape (synthesize
// a Game from the persisted session, validate locally for instant feedback,
// fire the server submit fire-and-forget) with per-mode twists layered on:
// Time is Money grows the clock as points bank; Golden Ticket lights up a
// wildcard at the center and reveals every letter that completes the frame.
export function ExperimentalPlayRoute() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const modeKey = mode as ExperimentalModeKey;
  const valid = !!mode && Object.prototype.hasOwnProperty.call(EXPERIMENTAL_MODES, mode);
  const { authReady, muted, toggleMute, registerActiveRun } = useGame();

  const isMoney = modeKey === 'time-is-money';
  const isGolden = modeKey === 'golden-ticket';

  const [session, setSession] = useState<ExperimentalSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  // Active golden reveal — set when a golden draw succeeds, cleared when the
  // reveal window elapses so the built-in current-word banner takes back over.
  const [reveal, setReveal] = useState<{ result: GoldenLocalResult; nonce: number } | null>(null);
  const revealNonceRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<ExperimentalSession | null>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const sessionLive = !!session && !session.ended_at;
  useEffect(() => {
    if (!sessionLive) return;
    return registerActiveRun();
  }, [sessionLive, registerActiveRun]);

  useEffect(() => {
    if (!authReady || !valid) return;
    let cancelled = false;
    (async () => {
      const s = await fetchExperimentalSession(modeKey, todayPST());
      if (cancelled) return;
      setSession(s);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, valid, modeKey]);

  useEffect(() => () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, []);

  const validator = useWordValidator();
  useEffect(() => {
    validator.setSource(session?.salt ?? '', session?.wordHashes ?? []);
  }, [session?.salt, session?.wordHashes, validator]);
  useEffect(() => {
    validator.setSubmitted(session?.found_words ?? []);
  }, [session?.found_words, validator]);

  // Local hash set for Golden Ticket wildcard completions. Built once per
  // salt/hashes update; the enumeration in `goldenCompletions` checks each of
  // the 26 blank-fills against it for O(1) membership.
  const goldenHashSet = useMemo(
    () => new Set(session?.goldenHashes ?? []),
    [session?.goldenHashes],
  );

  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

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

  const triggerReveal = useCallback((result: GoldenLocalResult) => {
    revealNonceRef.current += 1;
    setReveal({ result, nonce: revealNonceRef.current });
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    const nonce = revealNonceRef.current;
    revealTimerRef.current = setTimeout(() => {
      // Only clear if a newer reveal hasn't superseded this one.
      if (revealNonceRef.current === nonce) setReveal(null);
    }, GOLDEN_REVEAL_DURATION_MS);
  }, []);

  // Append one or more accepted words to the local session and bump aggregates.
  // Time is Money's timer picks up the new points via the derived duration in
  // the memoized Game object; Golden Ticket doesn't need per-word state
  // beyond the found list.
  const acceptWords = useCallback(
    (current: ExperimentalSession, words: { word: string; score: number }[]) => {
      const totalScore = words.reduce((sum, w) => sum + w.score, 0);
      const nextFound = [...current.found_words, ...words.map((w) => w.word)];
      let longest = current.longest_word;
      for (const { word } of words) {
        if (word.length > longest.length) longest = word;
      }
      setSession({
        ...current,
        found_words: nextFound,
        points: current.points + totalScore,
        word_count: nextFound.length,
        longest_word: longest,
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (path: Position[]) => {
      const current = sessionRef.current;
      if (!current || current.ended_at) return;

      const goldenPath = isGolden && pathTouchesGolden(path, current.board_size);

      // ── Golden Ticket path ─────────────────────────────────────────────────
      if (goldenPath) {
        // Local, instant validation via the shipped goldenHashes. Enumerate
        // the 26 blank-fills, keep the ones that hash-hit and aren't already
        // found. No round trip.
        if (!current.salt || goldenHashSet.size === 0) {
          // Hashes not armed yet (very first moment after start). Fall back to
          // the server round-trip so the player can still play, then rehydrate.
          const outcome = await submitExperimentalWord(modeKey, current.date, path);
          if (!outcome.valid) {
            flashFeedback(path, { valid: false, reason: outcome.reason });
            return;
          }
          flashFeedback(path, { valid: true });
          triggerReveal({ words: outcome.words, totalScore: outcome.totalScore });
          acceptWords(current, outcome.words);
          return;
        }

        const result = goldenCompletions({
          path,
          board: current.board,
          boardSize: current.board_size,
          minWordLength: current.min_word_length,
          salt: current.salt,
          goldenHashes: goldenHashSet,
          foundWords: new Set(current.found_words.map((w) => w.toUpperCase())),
        });
        if (!result) {
          flashFeedback(path, { valid: false, reason: 'invalid' });
          // Record the rejected attempt server-side (fire-and-forget).
          submitExperimentalWord(modeKey, current.date, path).catch(() => {});
          return;
        }

        flashFeedback(path, { valid: true });
        triggerReveal(result);
        for (const w of result.words) validator.recordSubmitted(w.word);
        acceptWords(current, result.words);

        // Fire-and-forget server submit — the local list is authoritative for
        // display, the server is authoritative for persistence. Single retry on
        // transient failure, mirroring the gauntlet/timed daily pattern.
        const fire = () => submitExperimentalWord(modeKey, current.date, path);
        fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
        return;
      }

      // ── Normal path (both modes) ───────────────────────────────────────────
      const word = path
        .map((p) => current.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      if (!validator.isArmed()) {
        const outcome = await submitExperimentalWord(modeKey, current.date, path);
        if (!outcome.valid) {
          flashFeedback(path, { valid: false, reason: outcome.reason });
          return;
        }
        flashFeedback(path, { valid: true });
        acceptWords(current, outcome.words);
        return;
      }

      const local = validator.validate(word);
      flashFeedback(path, local);
      if (!local.valid) {
        // Record the rejected attempt server-side (fire-and-forget).
        submitExperimentalWord(modeKey, current.date, path).catch(() => {});
        return;
      }

      validator.recordSubmitted(word);
      acceptWords(current, [{ word, score: scoreWord(word) }]);

      const fire = () => submitExperimentalWord(modeKey, current.date, path);
      fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
    },
    [
      isGolden,
      modeKey,
      validator,
      goldenHashSet,
      flashFeedback,
      triggerReveal,
      acceptWords,
    ],
  );

  const finalizeAndExit = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || navigatingRef.current) return;
    navigatingRef.current = true;
    if (!current.ended_at) {
      const ended = await endExperimentalSession(modeKey, current.date);
      if (ended) setSession(ended);
    }
    navigate(`/daily/experimental/${modeKey}/results`);
  }, [navigate, modeKey]);

  // Synthesize the Game. Time is Money's duration grows with points (a fixed
  // number of seconds per point); every other mode runs the plain base clock.
  const game: Game | null = useMemo(() => {
    if (!session) return null;
    const base = session.time_limit;
    return {
      board: session.board,
      startedAt: new Date(session.started_at).getTime(),
      status: session.ended_at ? GameState.Finished : GameState.InProgress,
      config: {
        durationSeconds: isMoney
          ? base + session.points * TIME_IS_MONEY_SECONDS_PER_POINT
          : base,
        boardSize: session.board_size,
        minWordLength: session.min_word_length,
      },
    };
  }, [session, isMoney]);

  const timeRemaining = useTimer(game, finalizeAndExit);

  const cellDecorations = useMemo(() => {
    if (!isGolden || !session) return undefined;
    const center = goldenCell(session.board_size);
    return (row: number, col: number): CellDecoration | null => {
      if (row === center.row && col === center.col) {
        return { overlay: <GoldenTileOverlay /> };
      }
      return null;
    };
  }, [isGolden, session]);

  useEffect(() => {
    if (!loaded || !valid) return;
    if (!session) {
      navigate(`/daily/experimental/${modeKey}`, { replace: true });
      return;
    }
    if (session.ended_at) {
      navigate(`/daily/experimental/${modeKey}/results`, { replace: true });
    }
  }, [loaded, valid, session, modeKey, navigate]);

  if (!loaded || !session || session.ended_at || !game || game.status !== GameState.InProgress) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  return (
    <GamePage
      game={game}
      words={[]}
      timeRemaining={timeRemaining}
      feedback={feedback}
      onSubmitWord={handleSubmit}
      onCancelGame={finalizeAndExit}
      onEndGame={finalizeAndExit}
      muted={muted}
      onToggleMute={toggleMute}
      modeLabel={EXPERIMENTAL_MODES[modeKey].name}
      cellDecorations={cellDecorations}
      timerBar={isMoney ? <OverflowTimerBar game={game} baseSeconds={session.time_limit} /> : undefined}
      wordDisplayOverride={
        reveal ? (
          <GoldenReveal
            key={reveal.nonce}
            words={reveal.result.words}
            totalScore={reveal.result.totalScore}
          />
        ) : undefined
      }
    />
  );
}
