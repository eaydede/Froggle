import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Position } from 'models';
import { useGame } from '../../GameContext';
import { Board, type FeedbackType, computeFeedbackColors } from '../game/components';
import { useFeedbackSounds } from '../game';
import { InkButton } from '../../shared/components/InkButton';
import {
  endDailyRelaxedSession,
  startDailyRelaxedSession,
  submitDailyRelaxedWord,
  type DailyRelaxedSession,
} from '../../shared/api/gameApi';

const BOARD_STYLE = {
  base: 0,
  hover: 0,
  press: 3,
  sound: 0,
  colorWash: 35,
  preact: 1,
  preactRadius: 130,
  preactIntensity: 100,
} as const;

export function RelaxedGameRoute() {
  const navigate = useNavigate();
  const {
    cachedDailyRelaxed,
    cachedDailyRelaxedSession,
    setCachedDailyRelaxedSession,
    dailyRelaxedLoaded,
    authReady,
    muted,
    toggleMute,
  } = useGame();

  const [session, setSession] = useState<DailyRelaxedSession | null>(cachedDailyRelaxedSession);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const inFlightRef = useRef(false);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Keep local in sync when context refreshes (e.g., on auth ready).
  useEffect(() => {
    setSession(cachedDailyRelaxedSession);
  }, [cachedDailyRelaxedSession]);

  // If the session is already ended, the play page is the wrong destination.
  useEffect(() => {
    if (session?.ended_at) navigate('/daily/relaxed/results', { replace: true });
  }, [session?.ended_at, navigate]);

  const handleStart = useCallback(async () => {
    if (!cachedDailyRelaxed || starting) return;
    setStarting(true);
    try {
      const fresh = await startDailyRelaxedSession(cachedDailyRelaxed.date);
      setSession(fresh);
      setCachedDailyRelaxedSession(fresh);
    } finally {
      setStarting(false);
    }
  }, [cachedDailyRelaxed, starting, setCachedDailyRelaxedSession]);

  const handleSubmitWord = useCallback(
    async (path: Position[]) => {
      if (!session || session.ended_at || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const outcome = await submitDailyRelaxedWord(session.date, path);
        let type: FeedbackType;
        if (outcome.valid) {
          type = 'valid';
          if (!muted) playValid();
          // Optimistic update — server is canonical, but we don't need the
          // round-trip overhead of refetching the whole session for each
          // word found.
          if (outcome.word) {
            setSession((prev) => {
              if (!prev) return prev;
              const nextWords = [...prev.found_words, outcome.word!];
              const nextPoints = prev.points + (outcome.score ?? 0);
              const nextLongest = nextWords.reduce(
                (best, w) => (w.length > best.length ? w : best),
                prev.longest_word,
              );
              const next = {
                ...prev,
                found_words: nextWords,
                points: nextPoints,
                word_count: nextWords.length,
                longest_word: nextLongest,
              };
              setCachedDailyRelaxedSession(next);
              return next;
            });
          }
        } else if (outcome.reason === 'repeat') {
          type = 'duplicate';
          if (!muted) playDuplicate();
        } else {
          type = 'invalid';
          if (!muted) playInvalid();
        }
        setFeedback({ type, path });
        setTimeout(() => setFeedback(null), 200);
      } finally {
        inFlightRef.current = false;
      }
    },
    [session, muted, playValid, playInvalid, playDuplicate, setCachedDailyRelaxedSession],
  );

  const handleEnd = async () => {
    if (!session) return;
    const ended = await endDailyRelaxedSession(session.date);
    if (ended) {
      setSession(ended);
      setCachedDailyRelaxedSession(ended);
    }
    navigate('/daily/relaxed/results');
  };

  if (!authReady || !dailyRelaxedLoaded || !cachedDailyRelaxed) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  // Intro state: the user committed to playing from the landing card but
  // hasn't generated a session row yet. One tap to start.
  if (!session) {
    return (
      <RelaxedIntro
        puzzleNumber={cachedDailyRelaxed.number}
        onStart={handleStart}
        onBack={() => navigate('/')}
        starting={starting}
      />
    );
  }

  const colors = computeFeedbackColors(BOARD_STYLE.colorWash);

  return (
    <div
      className="w-full max-w-[500px] mx-auto flex flex-col items-center"
      style={{ '--board-size': cachedDailyRelaxed.config.boardSize } as React.CSSProperties}
    >
      <ScoreHeader
        points={session.points}
        words={session.word_count}
        onEnd={() => setShowEndConfirm(true)}
      />

      <CurrentWordBanner feedback={feedback} board={cachedDailyRelaxed.board} colors={colors} />

      <div className="w-full">
        <Board
          board={cachedDailyRelaxed.board}
          onSubmitWord={handleSubmitWord}
          feedback={feedback}
          baseStyleIndex={BOARD_STYLE.base}
          hoverStyleIndex={BOARD_STYLE.hover}
          pressStyleIndex={BOARD_STYLE.press}
          soundIndex={muted ? 4 : BOARD_STYLE.sound}
          colorWash={BOARD_STYLE.colorWash}
          preactStyleIndex={BOARD_STYLE.preact}
          preactRadius={BOARD_STYLE.preactRadius}
          preactIntensity={BOARD_STYLE.preactIntensity}
        />
      </div>

      <FoundWordsList words={session.found_words} />

      <FooterRow
        modeLabel={`Daily Relaxed #${cachedDailyRelaxed.number}`}
        boardSize={cachedDailyRelaxed.config.boardSize}
        minWordLength={cachedDailyRelaxed.config.minWordLength}
        muted={muted}
        onToggleMute={toggleMute}
      />

      {showEndConfirm && (
        <EndConfirmModal
          points={session.points}
          words={session.word_count}
          onConfirm={() => {
            setShowEndConfirm(false);
            void handleEnd();
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
}

function RelaxedIntro({
  puzzleNumber,
  onStart,
  onBack,
  starting,
}: {
  puzzleNumber: number;
  onStart: () => void;
  onBack: () => void;
  starting: boolean;
}) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="flex-1 flex flex-col justify-center gap-[26px] px-1">
          <div className="text-center">
            <div
              className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-3 font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              Daily Relaxed #{puzzleNumber}
            </div>
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              Take your time.
            </div>
          </div>
          <p className="text-small text-[color:var(--ink-muted)] text-center leading-[1.5]">
            No timer. Find as many words as you can. Leave and come back any time
            today — your progress is saved. End the puzzle when you're done.
          </p>
          <div className="flex flex-col gap-1">
            <InkButton onClick={onStart}>{starting ? 'Starting…' : 'Start'}</InkButton>
            <button
              type="button"
              onClick={onBack}
              className="bg-transparent border-none py-3 text-small text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] cursor-pointer text-center transition-colors duration-200 font-[family-name:var(--font-ui)]"
              style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreHeader({
  points,
  words,
  onEnd,
}: {
  points: number;
  words: number;
  onEnd: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 w-full">
      <div className="flex items-baseline gap-[5px]">
        <span
          className="text-2xl leading-none font-[family-name:var(--font-structure)] tabular-nums tracking-[-0.02em]"
          style={{ fontWeight: 800 }}
        >
          {points}
        </span>
        <span className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 600 }}>
          pts
        </span>
        <span className="text-small text-[color:var(--ink-soft)] ml-2 tabular-nums" style={{ fontWeight: 500 }}>
          {words} {words === 1 ? 'word' : 'words'}
        </span>
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="text-small px-3 py-1.5 rounded-lg border border-[var(--ink-border)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:border-[var(--ink-muted)] bg-transparent transition-colors duration-200 cursor-pointer font-[family-name:var(--font-ui)]"
        style={{ fontWeight: 600 }}
      >
        End puzzle
      </button>
    </div>
  );
}

function CurrentWordBanner({
  feedback,
  board,
  colors,
}: {
  feedback: { type: FeedbackType; path: Position[] } | null;
  board: string[][];
  colors: Record<string, string>;
}) {
  const word = feedback ? feedback.path.map((p) => board[p.row]?.[p.col] ?? '').join('') : '';
  const color =
    feedback?.type === 'valid'
      ? colors.valid
      : feedback?.type === 'invalid'
      ? colors.invalid
      : feedback?.type === 'duplicate'
      ? colors.duplicate
      : '#bbb';
  return (
    <div
      className="h-9 flex items-center justify-center tracking-wider my-2"
      style={{
        color,
        fontFamily: 'var(--font-cell)',
        fontWeight: 800,
        fontSize: '1.4rem',
      }}
    >
      {word.toUpperCase()}
    </div>
  );
}

function FoundWordsList({ words }: { words: string[] }) {
  if (words.length === 0) {
    return (
      <p
        className="text-small text-[color:var(--ink-soft)] mt-3 text-center"
        style={{ fontWeight: 500 }}
      >
        Find your first word to get started.
      </p>
    );
  }
  // Newest first so the just-found word is always visible.
  const ordered = [...words].reverse();
  return (
    <div className="w-full mt-3 px-2">
      <div
        className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-soft)] mb-1.5 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        Found ({words.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ordered.map((w) => (
          <span
            key={w}
            className="text-xs px-2 py-1 rounded-md bg-[var(--ink-whisper)] text-[color:var(--ink)] tabular-nums font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 600, letterSpacing: '0.02em' }}
          >
            {w.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function FooterRow({
  modeLabel,
  boardSize,
  minWordLength,
  muted,
  onToggleMute,
}: {
  modeLabel: string;
  boardSize: number;
  minWordLength: number;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="flex items-center justify-between w-full mt-3">
      <div
        className="flex items-center gap-2.5 text-[0.6rem] text-[var(--text-muted)] select-none"
        style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
      >
        <span className="font-semibold">{modeLabel}</span>
        <span className="opacity-60">
          {boardSize}x{boardSize}
        </span>
        <span className="opacity-60">≥{minWordLength} letters</span>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        className="bg-transparent border-none cursor-pointer text-[#bbb] hover:text-[#888] transition-colors duration-150 p-1 flex items-center justify-center"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>
    </div>
  );
}

function EndConfirmModal({
  points,
  words,
  onConfirm,
  onCancel,
}: {
  points: number;
  words: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--surface-card)] rounded-xl py-6 px-7 shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-center max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-base text-[color:var(--ink)] m-0 mb-2"
          style={{ fontWeight: 600 }}
        >
          End the puzzle?
        </p>
        <p
          className="text-small text-[color:var(--ink-muted)] m-0 mb-5"
          style={{ fontWeight: 500 }}
        >
          You'll finalize at {points} pts ({words} {words === 1 ? 'word' : 'words'}). You can't keep playing today.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="py-2 px-6 bg-[var(--ink)] text-[var(--surface-panel)] border-none rounded-lg cursor-pointer text-sm font-[family-name:var(--font-button)] [font-weight:var(--font-button-weight)]"
          >
            End puzzle
          </button>
          <button
            onClick={onCancel}
            className="py-2 px-6 bg-[var(--ink-whisper)] text-[color:var(--ink)] border-none rounded-lg cursor-pointer text-sm font-[family-name:var(--font-button)] [font-weight:var(--font-button-weight)]"
          >
            Keep playing
          </button>
        </div>
      </div>
    </div>
  );
}
