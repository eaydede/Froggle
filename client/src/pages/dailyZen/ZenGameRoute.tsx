import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Position } from 'models';
import { useGame } from '../../GameContext';
import { Board, type FeedbackType, computeFeedbackColors } from '../game/components';
import { useFeedbackSounds } from '../game';
import { InkButton } from '../../shared/components/InkButton';
import { IconAction } from '../../shared/components/IconAction';
import { scoreWord } from '../../shared/utils/score';
import { RARITY_VAR, wordRarity } from '../results/utils/wordRarity';
import {
  endDailyZenSession,
  startDailyZenSession,
  submitDailyZenWord,
  type DailyZenSession,
} from '../../shared/api/gameApi';

type WordSort = 'recent' | 'score';

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

export function ZenGameRoute() {
  const navigate = useNavigate();
  const {
    cachedDailyZen,
    cachedDailyZenSession,
    setCachedDailyZenSession,
    dailyZenLoaded,
    authReady,
    muted,
    toggleMute,
  } = useGame();

  const [session, setSession] = useState<DailyZenSession | null>(cachedDailyZenSession);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const inFlightRef = useRef(false);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  // Keep local in sync when context refreshes (e.g., on auth ready).
  useEffect(() => {
    setSession(cachedDailyZenSession);
  }, [cachedDailyZenSession]);

  // If the session is already ended, the play page is the wrong destination.
  useEffect(() => {
    if (session?.ended_at) navigate('/daily/zen/results', { replace: true });
  }, [session?.ended_at, navigate]);

  const handleStart = useCallback(async () => {
    if (!cachedDailyZen || starting) return;
    setStarting(true);
    try {
      const fresh = await startDailyZenSession(cachedDailyZen.date);
      setSession(fresh);
      setCachedDailyZenSession(fresh);
    } finally {
      setStarting(false);
    }
  }, [cachedDailyZen, starting, setCachedDailyZenSession]);

  const handleSubmitWord = useCallback(
    async (path: Position[]) => {
      if (!session || session.ended_at || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const outcome = await submitDailyZenWord(session.date, path);
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
              setCachedDailyZenSession(next);
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
    [session, muted, playValid, playInvalid, playDuplicate, setCachedDailyZenSession],
  );

  const handleEnd = async () => {
    if (!session) return;
    const ended = await endDailyZenSession(session.date);
    if (ended) {
      setSession(ended);
      setCachedDailyZenSession(ended);
    }
    navigate('/daily/zen/results');
  };

  if (!authReady || !dailyZenLoaded || !cachedDailyZen) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  // Intro state: the user committed to playing from the landing card but
  // hasn't generated a session row yet. One tap to start.
  if (!session) {
    return (
      <ZenIntro
        puzzleNumber={cachedDailyZen.number}
        onStart={handleStart}
        onBack={() => navigate('/')}
        starting={starting}
      />
    );
  }

  const colors = computeFeedbackColors(BOARD_STYLE.colorWash);

  return (
    <div
      className="w-full max-w-[500px] mx-auto flex flex-col flex-1 min-h-0"
      style={{ '--board-size': cachedDailyZen.config.boardSize } as React.CSSProperties}
    >
      <ScoreHeader
        points={session.points}
        words={session.word_count}
        onBack={() => navigate('/')}
        onEnd={() => setShowEndConfirm(true)}
      />

      <CurrentWordBanner feedback={feedback} board={cachedDailyZen.board} colors={colors} />

      <div className="w-full">
        <Board
          board={cachedDailyZen.board}
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

      <FooterRow
        modeLabel={`Zen Daily #${cachedDailyZen.number}`}
        boardSize={cachedDailyZen.config.boardSize}
        minWordLength={cachedDailyZen.config.minWordLength}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <FoundWordsList words={session.found_words} />

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

function ZenIntro({
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
              Zen Daily #{puzzleNumber}
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
  onBack,
  onEnd,
}: {
  points: number;
  words: number;
  onBack: () => void;
  onEnd: () => void;
}) {
  return (
    <div
      className="grid items-center gap-2.5 pt-3.5 shrink-0"
      style={{ gridTemplateColumns: '32px 1fr auto' }}
    >
      <IconAction onClick={onBack} label="Back to home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </IconAction>
      <div className="flex items-baseline gap-[5px] justify-center">
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
        className="px-3 h-8 rounded-[10px] text-[11px] uppercase tracking-[0.08em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--ink-whisper)] bg-transparent border-none transition-colors duration-200 cursor-pointer font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
      >
        End
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
      className="h-9 flex items-center justify-center tracking-wider my-2 shrink-0"
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
  const [sort, setSort] = useState<WordSort>('recent');
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);

  // 'recent' uses the order words were found in (last → first). 'score' ranks
  // by point value, with longer words ahead on a tie so high-effort finds
  // surface above filler.
  const ordered = useMemo(() => {
    if (sort === 'recent') return [...words].reverse();
    return [...words].sort(
      (a, b) => scoreWord(b) - scoreWord(a) || b.length - a.length || a.localeCompare(b),
    );
  }, [words, sort]);

  const updateFade = () => {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.clientHeight - el.scrollTop < 2);
  };

  useLayoutEffect(updateFade, [ordered]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateFade);
    return () => el.removeEventListener('scroll', updateFade);
  }, []);

  const total = words.reduce((sum, w) => sum + scoreWord(w), 0);

  return (
    <div className="w-full mt-3 flex-1 min-h-0 flex flex-col rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <SectionHeader count={words.length} total={total} sort={sort} onSortChange={setSort} />
      {words.length === 0 ? (
        <div
          className="px-3 py-3 text-[11px] text-[color:var(--ink-soft)] text-center"
          style={{ fontWeight: 500 }}
        >
          Find your first word to get started.
        </div>
      ) : (
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            WebkitMaskImage: atBottom
              ? 'none'
              : 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
            maskImage: atBottom
              ? 'none'
              : 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
            scrollbarWidth: 'thin',
          }}
        >
          {ordered.map((w, i) => (
            <WordRow key={w} word={w} first={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  count,
  total,
  sort,
  onSortChange,
}: {
  count: number;
  total: number;
  sort: WordSort;
  onSortChange: (v: WordSort) => void;
}) {
  return (
    <div
      className="flex justify-between items-center px-3 py-[9px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] leading-none font-[family-name:var(--font-structure)] shrink-0"
      style={{ fontWeight: 700 }}
    >
      <span>
        Found
        <span className="tabular-nums"> · {count}</span>
      </span>
      <div className="flex items-center gap-2">
        <SortToggle value={sort} onChange={onSortChange} />
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function WordRow({ word, first }: { word: string; first: boolean }) {
  const score = scoreWord(word);
  const rarity = wordRarity(score);
  return (
    <div
      className={[
        'relative flex justify-between items-center py-[7px] pr-3 pl-[17px] text-xs tracking-[0.02em] font-[family-name:var(--font-ui)] text-[color:var(--ink)]',
        first ? '' : 'border-t border-[var(--ink-border-subtle)]',
      ].join(' ')}
      style={{ fontWeight: 500 }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-[5px] bottom-[5px] w-1 rounded-r-[2px]"
        style={{ background: RARITY_VAR[rarity] }}
      />
      <span className="tabular-nums">{word}</span>
      <span
        className="text-[11px] tabular-nums font-[family-name:var(--font-structure)] text-[color:var(--ink-soft)]"
        style={{ fontWeight: 700 }}
      >
        +{score}
      </span>
    </div>
  );
}

function SortToggle({
  value,
  onChange,
}: {
  value: WordSort;
  onChange: (v: WordSort) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 normal-case tracking-normal">
      <SortChoice active={value === 'recent'} onClick={() => onChange('recent')}>
        Recent
      </SortChoice>
      <span className="text-[color:var(--ink-faint)]" aria-hidden>
        ·
      </span>
      <SortChoice active={value === 'score'} onClick={() => onChange('score')}>
        Score
      </SortChoice>
    </div>
  );
}

function SortChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-[10px] uppercase tracking-[0.08em] bg-transparent border-none cursor-pointer transition-colors duration-150 font-[family-name:var(--font-structure)] ' +
        (active
          ? 'text-[color:var(--ink)]'
          : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink-muted)]')
      }
      style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
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
    <div className="flex items-center justify-between w-full mt-3 shrink-0">
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
