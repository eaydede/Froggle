import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Game, Position, Word } from 'models';
import { Board, FeedbackType, computeFeedbackColors, type CellDecoration } from './components/Board';
import { TimerBar } from './components/TimerBar';

// Hardcoded board style defaults
const BOARD_STYLE = {
  base: 0,
  hover: 0,
  press: 3,
  sound: 0,
  colorWash: 35,
  preact: 1,
  preactRadius: 130,
  preactIntensity: 100,
  validAnim: 3,
} as const;

const VALID_ANIMATIONS = [
  'word-bounce 0.4s ease',
  'word-pulse 0.4s ease',
  'word-slide 0.5s ease',
  '', // wave is per-letter
];

interface GamePageProps {
  game: Game;
  words: Word[];
  timeRemaining: number;
  feedback: { type: FeedbackType; path: Position[]; bonus?: string | null } | null;
  onSubmitWord: (path: Position[]) => void;
  onCancelGame: () => void;
  onEndGame: () => void;
  muted: boolean;
  onToggleMute: () => void;
  dailyNumber?: number;
  /** Override for the bottom-left mode label. When set, takes precedence
   *  over the dailyNumber-derived default. Used by gauntlet rounds to
   *  carry both the round number and the modifier badge in a single line
   *  ("Gauntlet R2 · Hot: A · 2×"). */
  modeLabel?: string;
  /** Per-cell decorations (score badge / accent ring). Passes through to
   *  Board; used by gauntlet rounds to render Scrabble-style point values
   *  and flag the hot letter. */
  cellDecorations?: (row: number, col: number, letter: string) => CellDecoration | null;
  /** Override for the default countdown bar. When set, replaces the plain
   *  TimerBar — the Time is Money experimental mode uses this to render its
   *  growing, multi-layer overflow bar. The numeric readout still comes from
   *  `timeRemaining`. */
  timerBar?: ReactNode;
  /** Override for the current-word slot between the timer and the board. When
   *  set, replaces the built-in word display for the duration it is rendered.
   *  Golden Ticket uses this to show its reveal (the completed words + running
   *  total) in the same visual slot without shifting the board. */
  wordDisplayOverride?: ReactNode;
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const GamePage = ({ game, timeRemaining, feedback, onSubmitWord, onEndGame, muted, onToggleMute, dailyNumber, modeLabel: modeLabelOverride, cellDecorations, timerBar, wordDisplayOverride }: GamePageProps) => {
  const boardSize = game.board.length;
  const [displayWord, setDisplayWord] = useState('');
  const [wordFeedback, setWordFeedback] = useState<FeedbackType>(null);
  const [isFading, setIsFading] = useState(false);
  const [wordBonus, setWordBonus] = useState<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCurrentWordChange = useCallback((word: string) => {
    if (word) {
      setDisplayWord(word);
      setWordFeedback(null);
      setWordBonus(null);
      setIsFading(false);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (feedback) {
      const word = feedback.path.map(p => game.board[p.row]?.[p.col] || '').join('');
      setDisplayWord(word);
      setWordFeedback(feedback.type);
      setWordBonus(feedback.bonus ?? null);
      setIsFading(false);

      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      fadeTimerRef.current = setTimeout(() => {
        setIsFading(true);
        clearTimerRef.current = setTimeout(() => {
          setDisplayWord('');
          setWordFeedback(null);
          setWordBonus(null);
          setIsFading(false);
        }, 300);
      }, 800);
    }
  }, [feedback, game.board]);

  const colors = computeFeedbackColors(BOARD_STYLE.colorWash);

  function getWordAnimation(): string | undefined {
    if (wordFeedback === 'valid' && BOARD_STYLE.validAnim !== 3) {
      return VALID_ANIMATIONS[BOARD_STYLE.validAnim];
    }
    if (wordFeedback === 'invalid' || wordFeedback === 'duplicate') {
      return 'word-shake 0.3s ease';
    }
    return undefined;
  }

  function getWordColor(): string {
    if (wordFeedback === 'valid') return colors.valid;
    if (wordFeedback === 'invalid') return colors.invalid;
    if (wordFeedback === 'duplicate') return colors.duplicate;
    return '#bbb';
  }

  const isDaily = dailyNumber !== undefined;
  const modeLabel = modeLabelOverride ?? (isDaily ? `Daily #${dailyNumber}` : 'Free Play');

  return (
    <div className="w-full max-w-[500px] mx-auto flex flex-col items-center" style={{ '--board-size': boardSize } as React.CSSProperties}>
      {/* Timer section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 w-full">
        <div className="text-xl font-bold text-center w-13 flex items-center justify-center">
          {timeRemaining > 0 ? `${timeRemaining}s` : '∞'}
        </div>
        {timerBar ?? <TimerBar game={game} />}
        <button
          onClick={onEndGame}
          className="w-8 h-8 border-none bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 hover:scale-110 hover:opacity-70 shrink-0 p-0 text-[color:var(--ink-soft)]"
          aria-label="End game"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Current word display — fixed height so board doesn't shift. When the
          caller provides a wordDisplayOverride (Golden Ticket reveal), it takes
          this slot; the built-in banner is hidden underneath. */}
      <div className="h-9 flex items-center justify-center my-2 relative">
        {wordDisplayOverride ?? (
          <div
            className={`flex items-center justify-center tracking-wider transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{
              color: getWordColor(),
              animation: getWordAnimation(),
              fontFamily: 'var(--font-cell)',
              fontWeight: 800,
              fontSize: '1.4rem',
            }}
          >
            {wordFeedback === 'valid' && BOARD_STYLE.validAnim === 3
              ? displayWord.toUpperCase().split('').map((letter, i) => (
                  <span key={i} className="inline-block" style={{ animation: 'letter-wave 0.4s ease both', animationDelay: `${i * 0.04}s` }}>
                    {letter}
                  </span>
                ))
              : displayWord.toUpperCase()
            }
            {wordFeedback === 'valid' && wordBonus && (
              <span
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs tabular-nums"
                style={{
                  backgroundColor: 'var(--hot-letter-bg)',
                  color: 'var(--hot-letter-fg)',
                  boxShadow: '0 1px 4px var(--hot-letter-glow)',
                  fontWeight: 800,
                  animation: 'word-pulse 0.4s ease',
                }}
              >
                <span aria-hidden>✦</span>
                {wordBonus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="w-full">
        <Board
          board={game.board}
          onSubmitWord={onSubmitWord}
          feedback={feedback}
          baseStyleIndex={BOARD_STYLE.base}
          hoverStyleIndex={BOARD_STYLE.hover}
          pressStyleIndex={BOARD_STYLE.press}
          soundIndex={muted ? 4 : BOARD_STYLE.sound}
          colorWash={BOARD_STYLE.colorWash}
          preactStyleIndex={BOARD_STYLE.preact}
          preactRadius={BOARD_STYLE.preactRadius}
          preactIntensity={BOARD_STYLE.preactIntensity}
          onCurrentWordChange={handleCurrentWordChange}
          cellDecorations={cellDecorations}
        />
      </div>

      {/* Footer: mute toggle + mode label */}
      <div className="flex items-center justify-between w-full mt-1.5">
        {/* Mode label */}
        <div className="flex items-center gap-2.5 text-[0.6rem] text-[color:var(--ink-soft)] select-none" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          <span className="font-semibold">{modeLabel}</span>
          <span className="flex items-center gap-1 opacity-60">
            {/* Board icon */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
              <rect x="5.5" y="0.5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
              <rect x="0.5" y="5.5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
              <rect x="5.5" y="5.5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
            </svg>
            {boardSize}x{boardSize}
          </span>
          <span className="flex items-center gap-1 opacity-60">
            {/* Timer icon */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTimer(game.config.durationSeconds)}
          </span>
          <span className="flex items-center gap-1 opacity-60">
            {/* Letter icon */}
            <span style={{ fontSize: '0.65rem', fontWeight: 600, lineHeight: 1 }}>≥</span>
            {game.config.minWordLength} letters
          </span>
        </div>

        {/* Mute toggle */}
        <button
          className="bg-transparent border-none cursor-pointer text-[#bbb] hover:text-[#888] transition-colors duration-150 p-1 flex items-center justify-center"
          onClick={onToggleMute}
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
    </div>
  );
};
