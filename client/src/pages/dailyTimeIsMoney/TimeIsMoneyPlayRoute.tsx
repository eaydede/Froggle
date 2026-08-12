import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, type Game, type Position } from 'models';
import { TIME_IS_MONEY_SECONDS_PER_POINT } from 'models/timeIsMoney';
import { useGame } from '../../GameContext';
import { GamePage } from '../game/GamePage';
import { useFeedbackSounds, type FeedbackType } from '../game';
import { useTimer } from '../../hooks/useTimer';
import { useWordValidator } from '../../hooks/useWordValidator';
import { scoreWord } from '../../shared/utils/score';
import { OverflowTimerBar } from './components/OverflowTimerBar';
import {
  endTimeIsMoneySession,
  fetchTimeIsMoneySession,
  submitTimeIsMoneyWord,
  type TimeIsMoneySession,
} from '../../shared/api/timeIsMoneyApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

// Plays Time is Money. Follows the gauntlet play-route shape — synthesize a
// Game from the persisted session, validate locally for instant feedback, fire
// the server submit fire-and-forget — with the mode's one twist layered on: the
// clock's duration grows with every point banked.
export function TimeIsMoneyPlayRoute() {
  const navigate = useNavigate();
  const { authReady, muted, toggleMute, registerActiveRun } = useGame();

  const [session, setSession] = useState<TimeIsMoneySession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const sessionRef = useRef<TimeIsMoneySession | null>(null);
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
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      const s = await fetchTimeIsMoneySession(todayPST());
      if (cancelled) return;
      setSession(s);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const validator = useWordValidator();
  useEffect(() => {
    validator.setSource(session?.salt ?? '', session?.wordHashes ?? []);
  }, [session?.salt, session?.wordHashes, validator]);
  useEffect(() => {
    validator.setSubmitted(session?.found_words ?? []);
  }, [session?.found_words, validator]);

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

  // Append an accepted word locally and bump the aggregates. The timer picks up
  // the new points through the derived duration in the memoized Game below.
  const acceptWord = useCallback(
    (current: TimeIsMoneySession, word: string, score: number) => {
      const nextFound = [...current.found_words, word];
      setSession({
        ...current,
        found_words: nextFound,
        points: current.points + score,
        word_count: nextFound.length,
        longest_word:
          word.length > current.longest_word.length ? word : current.longest_word,
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (path: Position[]) => {
      const current = sessionRef.current;
      if (!current || current.ended_at) return;

      const word = path
        .map((p) => current.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      if (!validator.isArmed()) {
        const outcome = await submitTimeIsMoneyWord(current.date, path);
        if (!outcome.valid) {
          flashFeedback(path, { valid: false, reason: outcome.reason });
          return;
        }
        flashFeedback(path, { valid: true });
        acceptWord(current, outcome.word, outcome.score);
        return;
      }

      const local = validator.validate(word);
      flashFeedback(path, local);
      if (!local.valid) return;

      validator.recordSubmitted(word);
      acceptWord(current, word, scoreWord(word));

      // Fire-and-forget server submit — the local list is authoritative for
      // display, the server is authoritative for persistence. Single retry on
      // transient failure, mirroring the gauntlet/timed daily pattern.
      const fire = () => submitTimeIsMoneyWord(current.date, path);
      fire().catch(() => setTimeout(() => fire().catch(() => {}), 200));
    },
    [validator, flashFeedback, acceptWord],
  );

  const finalizeAndExit = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || navigatingRef.current) return;
    navigatingRef.current = true;
    if (!current.ended_at) {
      const ended = await endTimeIsMoneySession(current.date);
      if (ended) setSession(ended);
    }
    navigate('/daily/time-is-money/results');
  }, [navigate]);

  // Synthesize the Game. The duration grows with points — a fixed number of
  // seconds per point on top of the starting clock.
  const game: Game | null = useMemo(() => {
    if (!session) return null;
    return {
      board: session.board,
      startedAt: new Date(session.started_at).getTime(),
      status: session.ended_at ? GameState.Finished : GameState.InProgress,
      config: {
        durationSeconds: session.time_limit + session.points * TIME_IS_MONEY_SECONDS_PER_POINT,
        boardSize: session.board_size,
        minWordLength: session.min_word_length,
      },
    };
  }, [session]);

  const timeRemaining = useTimer(game, finalizeAndExit);

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      navigate('/daily/time-is-money', { replace: true });
      return;
    }
    if (session.ended_at) {
      navigate('/daily/time-is-money/results', { replace: true });
    }
  }, [loaded, session, navigate]);

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
      modeLabel="Time is Money"
      timerBar={<OverflowTimerBar game={game} baseSeconds={session.time_limit} />}
    />
  );
}
