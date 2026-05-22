import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameState, type Game, type Position } from 'models';
import { useGame } from '../../GameContext';
import { GamePage } from '../game/GamePage';
import { useFeedbackSounds, type FeedbackType } from '../game';
import { useTimer } from '../../hooks/useTimer';
import { useWordValidator } from '../../hooks/useWordValidator';
import { scoreGauntletWord } from '../../shared/utils/gauntletScore';
import { roundTitle } from './modifierDisplay';
import type { CellDecoration } from '../game/components/Board';
import {
  endGauntletRound,
  fetchGauntletRoundSession,
  submitGauntletWord,
  type GauntletRoundSession,
} from '../../shared/api/gauntletApi';

// Plays one round of the gauntlet. Mirrors the timed-daily play flow in
// GameContext (synthesize Game from the persisted session, validate
// locally for instant feedback, fire the server submit in the background)
// but keeps its state local so GameContext doesn't grow a third copy of
// the timed-session machinery.
export function GauntletPlayRoute() {
  const { round } = useParams<{ round: string }>();
  const navigate = useNavigate();
  const roundIndex = Number(round);
  const { authReady, muted, toggleMute } = useGame();

  const [session, setSession] = useState<GauntletRoundSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: FeedbackType; path: Position[]; bonus?: string | null } | null
  >(null);
  const sessionRef = useRef<GauntletRoundSession | null>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Initial session load. The confirm route should have already called
  // startGauntletRound; if it didn't, the GET returns null and we bounce.
  useEffect(() => {
    if (!authReady || !Number.isFinite(roundIndex)) return;
    let cancelled = false;
    (async () => {
      // Today's date for the gauntlet — derived from the system clock at
      // the device. This is OK because the server enforces it via the
      // session row (date column).
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Los_Angeles',
      });
      const s = await fetchGauntletRoundSession(today, roundIndex);
      if (cancelled) return;
      setSession(s);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, roundIndex]);

  const validator = useWordValidator();
  useEffect(() => {
    validator.setSource(session?.salt ?? '', session?.wordHashes ?? []);
  }, [session?.salt, session?.wordHashes, validator]);
  useEffect(() => {
    validator.setSubmitted(session?.foundWords ?? []);
  }, [session?.foundWords, validator]);

  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  const flashFeedback = useCallback(
    (path: Position[], outcome: { valid: boolean; reason?: string }, bonus?: string | null) => {
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
      setFeedback({ type, path, bonus });
      setTimeout(() => setFeedback(null), 200);
    },
    [muted, playValid, playInvalid, playDuplicate],
  );

  // Returns the bonus label to flash alongside a valid word, or null if
  // the round has no per-word bonus. Hot-letter rounds show "Nx" when the
  // word contains the hot letter; other rounds skip the badge.
  const computeWordBonus = useCallback(
    (word: string): string | null => {
      const modifier = sessionRef.current?.modifier;
      if (!modifier || modifier.kind !== 'hotLetter') return null;
      const upper = word.toUpperCase();
      if (!upper.includes(modifier.letter.toUpperCase())) return null;
      return `${modifier.multiplier}×`;
    },
    [],
  );

  const handleSubmit = useCallback(
    async (path: Position[]) => {
      const current = sessionRef.current;
      if (!current || current.endedAt) return;

      const word = path
        .map((p) => current.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      if (!validator.isArmed()) {
        const outcome = await submitGauntletWord(current.date, roundIndex, path);
        flashFeedback(path, outcome, outcome.valid && outcome.word ? computeWordBonus(outcome.word) : null);
        if (outcome.valid && outcome.word) {
          const score = outcome.score ?? scoreGauntletWord(outcome.word, current.modifier);
          const nextWords = [...current.foundWords, outcome.word];
          const nextLongest =
            outcome.word.length > current.longestWord.length ? outcome.word : current.longestWord;
          setSession({
            ...current,
            foundWords: nextWords,
            points: current.points + score,
            wordCount: nextWords.length,
            longestWord: nextLongest,
          });
        }
        return;
      }

      const local = validator.validate(word);
      flashFeedback(path, local, local.valid ? computeWordBonus(word) : null);
      if (!local.valid) return;

      validator.recordSubmitted(word);
      const score = scoreGauntletWord(word, current.modifier);
      const nextWords = [...current.foundWords, word];
      const nextLongest = word.length > current.longestWord.length ? word : current.longestWord;
      setSession({
        ...current,
        foundWords: nextWords,
        points: current.points + score,
        wordCount: nextWords.length,
        longestWord: nextLongest,
      });

      const fire = () => submitGauntletWord(current.date, roundIndex, path);
      fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
    },
    [validator, roundIndex, flashFeedback],
  );

  const finalizeAndExit = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    if (!current.endedAt) {
      const ended = await endGauntletRound(current.date, roundIndex);
      if (ended) setSession(ended);
    }
    navigate(`/daily/gauntlet/round/${roundIndex}/results`);
  }, [navigate, roundIndex]);

  // Synthesize a Game shape so GamePage can render without changes. The
  // Finished status flip is driven by ended_at the same way timed daily
  // works in GameContext.
  const game: Game | null = useMemo(() => {
    if (!session) return null;
    return {
      board: session.board,
      startedAt: new Date(session.startedAt).getTime(),
      status: session.endedAt ? GameState.Finished : GameState.InProgress,
      config: {
        durationSeconds: session.config.timeLimit,
        boardSize: session.config.boardSize,
        minWordLength: session.config.minWordLength,
      },
    };
  }, [session]);

  const timeRemaining = useTimer(game, finalizeAndExit);

  // Bounce-out conditions are deferred to an effect so they don't run
  // during render — calling navigate() mid-render triggers React's
  // "Cannot update a component while rendering a different component"
  // warning (and made the results board preview misbehave on tap).
  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      navigate(`/daily/gauntlet/round/${roundIndex}`, { replace: true });
      return;
    }
    if (session.endedAt) {
      navigate(`/daily/gauntlet/round/${roundIndex}/results`, { replace: true });
    }
  }, [loaded, session, roundIndex, navigate]);

  // No session loaded yet, or we're about to bounce — keep render side-
  // effect free (no setState during render). Loading placeholder covers
  // the moment between the bounce-effect firing and the new route
  // mounting.
  if (!loaded || !session || session.endedAt) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  if (!game || game.status !== GameState.InProgress) return null;

  const modeLabel = `Gauntlet R${roundIndex + 1} · ${roundTitle(session.roundKind)}`;

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
      modeLabel={modeLabel}
      cellDecorations={buildCellDecorations(session)}
    />
  );
}

// Per-cell decorations for a gauntlet round. Encodes the modifier visually
// on the board so the player doesn't need a separate header strip:
//
//   hotLetter   → accent ring on every cell whose letter matches the hot
//                 pick (Qu tile matches if either char matches)
//   rareLetters → score badge in bottom-right of every cell, Scrabble tile
//                 style (Qu tile sums Q + U so the badge reflects the
//                 actual contribution of the tile to a word)
//   regular     → no decoration
function buildCellDecorations(session: GauntletRoundSession) {
  const modifier = session.modifier;
  if (modifier.kind === 'regular') return undefined;
  if (modifier.kind === 'hotLetter') {
    const hot = modifier.letter.toUpperCase();
    return (_row: number, _col: number, letter: string): CellDecoration | null => {
      return letter.toUpperCase().includes(hot) ? { accent: 'hot' } : null;
    };
  }
  // rareLetters: sum per-letter values in the cell string so a Qu tile
  // shows the Q+U total — that's what the player gets when they use it.
  return (_row: number, _col: number, letter: string): CellDecoration | null => {
    let total = 0;
    for (const ch of letter.toUpperCase()) total += modifier.values[ch] ?? 0;
    if (total === 0) return null;
    return { badge: total };
  };
}
