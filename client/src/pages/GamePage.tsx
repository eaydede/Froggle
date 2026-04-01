import { useState, useCallback, useEffect, useRef } from 'react';
import { Game, Position, Word } from 'models';
import { Board, FeedbackType, BASE_LABELS, HOVER_LABELS, PRESS_LABELS, PREACT_LABELS, VALID_ANIM_LABELS, VALID_ANIM_STYLES, computeFeedbackColors } from '../components/Board';
import { SOUND_LABELS } from '../hooks/useThockSound';
import { VALID_SOUND_LABELS, INVALID_SOUND_LABELS, DUPLICATE_SOUND_LABELS } from '../hooks/useFeedbackSounds';
import { TimerBar } from '../components/TimerBar';

interface BoardStyleState {
  base: number;
  hover: number;
  press: number;
  sound: number;
  validSound: number;
  invalidSound: number;
  duplicateSound: number;
  colorWash: number;
  preact: number;
  preactRadius: number;
  preactIntensity: number;
  validAnim: number;
}

interface GamePageProps {
  game: Game;
  words: Word[];
  timeRemaining: number;
  feedback: { type: FeedbackType; path: Position[] } | null;
  onSubmitWord: (path: Position[]) => void;
  onCancelGame: () => void;
  onEndGame: () => void;
  boardStyle: BoardStyleState;
  onBoardStyleChange: (style: BoardStyleState) => void;
  showBoardStylePicker: boolean;
  muted: boolean;
  onToggleMute: () => void;
}

const VALID_ANIMATIONS = [
  'word-bounce 0.4s ease',
  'word-pulse 0.4s ease',
  'word-slide 0.5s ease',
  '', // wave is per-letter
];

export const GamePage = ({ game, timeRemaining, feedback, onSubmitWord, onEndGame, boardStyle, onBoardStyleChange, showBoardStylePicker, muted, onToggleMute }: GamePageProps) => {
  const boardSize = game.board.length;
  const [displayWord, setDisplayWord] = useState('');
  const [wordFeedback, setWordFeedback] = useState<FeedbackType>(null);
  const [isFading, setIsFading] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCurrentWordChange = useCallback((word: string) => {
    if (word) {
      setDisplayWord(word);
      setWordFeedback(null);
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
      setIsFading(false);

      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      fadeTimerRef.current = setTimeout(() => {
        setIsFading(true);
        clearTimerRef.current = setTimeout(() => {
          setDisplayWord('');
          setWordFeedback(null);
          setIsFading(false);
        }, 300);
      }, 800);
    }
  }, [feedback, game.board]);

  const colors = computeFeedbackColors(boardStyle.colorWash);

  function getWordAnimation(): string | undefined {
    if (wordFeedback === 'valid' && boardStyle.validAnim !== 3) {
      return VALID_ANIMATIONS[boardStyle.validAnim];
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
    return '#999';
  }

  const renderPicker = (label: string, options: string[], activeIndex: number, onChange: (i: number) => void) => (
    <div className="flex flex-col gap-1.5 py-1.5">
      <div className="text-xs text-[#888] font-semibold">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`px-2.5 py-1.5 text-[11px] rounded-md border-none cursor-pointer transition-colors duration-150 ${
              i === activeIndex
                ? 'bg-[#333] text-white'
                : 'bg-[#f0f0f0] text-[#666] hover:bg-[#e0e0e0]'
            }`}
            onClick={() => onChange(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[500px] mx-auto" style={{ '--board-size': boardSize } as React.CSSProperties}>
      {/* Timer section */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 mb-5">
        <div className="text-xl font-bold text-center w-13 flex items-center justify-center">
          {timeRemaining > 0 ? `${timeRemaining}s` : '∞'}
        </div>
        <TimerBar game={game} />
        <button
          onClick={onEndGame}
          className="w-8 h-8 border-none bg-transparent cursor-pointer flex items-center justify-center text-2xl font-bold text-red-500 transition-all duration-200 hover:scale-110 hover:opacity-70 shrink-0 p-0"
          aria-label="End game"
        >
          ✕
        </button>
      </div>

      {/* Board */}
      <div className="flex justify-center mt-4 mb-0.5 w-full">
        <div className="flex flex-col items-stretch w-full relative">
          <Board
            board={game.board}
            onSubmitWord={onSubmitWord}
            feedback={feedback}
            baseStyleIndex={boardStyle.base}
            hoverStyleIndex={boardStyle.hover}
            pressStyleIndex={boardStyle.press}
            soundIndex={muted ? 4 : boardStyle.sound}
            colorWash={boardStyle.colorWash}
            preactStyleIndex={boardStyle.preact}
            preactRadius={boardStyle.preactRadius}
            preactIntensity={boardStyle.preactIntensity}
            onCurrentWordChange={handleCurrentWordChange}
          />
        </div>
      </div>

      {/* Footer with mute toggle */}
      <div className="flex items-center justify-end h-6 mt-0">
        <button
          className="bg-transparent border-none cursor-pointer text-[#bbb] hover:text-[#888] transition-colors duration-150 p-1 flex items-center justify-center"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* Current word display */}
      <div
        className={`text-2xl font-black text-center min-h-9 flex items-center justify-center tracking-wider transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          color: getWordColor(),
          animation: getWordAnimation(),
          fontFamily: "'Roboto Mono', monospace",
        }}
      >
        {wordFeedback === 'valid' && boardStyle.validAnim === 3
          ? displayWord.split('').map((letter, i) => (
              <span key={i} className="inline-block" style={{ animation: 'letter-wave 0.4s ease both', animationDelay: `${i * 0.04}s` }}>
                {letter}
              </span>
            ))
          : displayWord
        }
      </div>

      {/* Board style picker (long-press Froggle title to toggle) */}
      {showBoardStylePicker && (
        <div className="mt-4 p-4 bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col gap-1">
          {renderPicker('Board Style', BASE_LABELS, boardStyle.base, (i) => onBoardStyleChange({ ...boardStyle, base: i }))}
          {renderPicker('Hover Effect', HOVER_LABELS, boardStyle.hover, (i) => onBoardStyleChange({ ...boardStyle, hover: i }))}
          {renderPicker('Press Effect', PRESS_LABELS, boardStyle.press, (i) => onBoardStyleChange({ ...boardStyle, press: i }))}
          {renderPicker('Cell Sound', SOUND_LABELS, boardStyle.sound, (i) => onBoardStyleChange({ ...boardStyle, sound: i }))}
          {renderPicker('Valid Word', VALID_SOUND_LABELS, boardStyle.validSound, (i) => onBoardStyleChange({ ...boardStyle, validSound: i }))}
          {renderPicker('Invalid Word', INVALID_SOUND_LABELS, boardStyle.invalidSound, (i) => onBoardStyleChange({ ...boardStyle, invalidSound: i }))}
          {renderPicker('Duplicate Word', DUPLICATE_SOUND_LABELS, boardStyle.duplicateSound, (i) => onBoardStyleChange({ ...boardStyle, duplicateSound: i }))}
          {renderPicker('Pre-Actuation', PREACT_LABELS, boardStyle.preact, (i) => onBoardStyleChange({ ...boardStyle, preact: i }))}
          {renderPicker('Valid Word Effect', VALID_ANIM_LABELS, boardStyle.validAnim, (i) => onBoardStyleChange({ ...boardStyle, validAnim: i }))}

          {boardStyle.preact !== 0 && (
            <>
              <div className="flex flex-col gap-1.5 py-1.5">
                <div className="text-xs text-[#888] font-semibold">Proximity Radius — {boardStyle.preactRadius}%</div>
                <input type="range" min="20" max="150" value={boardStyle.preactRadius}
                  onChange={(e) => onBoardStyleChange({ ...boardStyle, preactRadius: parseInt(e.target.value) })}
                  className="w-full" />
              </div>
              <div className="flex flex-col gap-1.5 py-1.5">
                <div className="text-xs text-[#888] font-semibold">Intensity — {boardStyle.preactIntensity}%</div>
                <input type="range" min="10" max="100" value={boardStyle.preactIntensity}
                  onChange={(e) => onBoardStyleChange({ ...boardStyle, preactIntensity: parseInt(e.target.value) })}
                  className="w-full" />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5 py-1.5">
            <div className="text-xs text-[#888] font-semibold">Feedback Colors — {boardStyle.colorWash}% wash</div>
            <div className="flex gap-1.5 mb-1">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.selected }} title="Selected" />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.valid }} title="Valid" />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.invalid }} title="Invalid" />
              <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.duplicate }} title="Duplicate" />
            </div>
            <input type="range" min="0" max="100" value={boardStyle.colorWash}
              onChange={(e) => onBoardStyleChange({ ...boardStyle, colorWash: parseInt(e.target.value) })}
              className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
};
