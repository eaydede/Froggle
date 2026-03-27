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

export const GamePage = ({ game, timeRemaining, feedback, onSubmitWord, onEndGame, boardStyle, onBoardStyleChange, showBoardStylePicker, muted, onToggleMute }: GamePageProps) => {
  const boardSize = game.board.length;
  const [currentWord, setCurrentWord] = useState('');
  const [displayWord, setDisplayWord] = useState('');
  const [wordFeedback, setWordFeedback] = useState<FeedbackType>(null);
  const [isFading, setIsFading] = useState(false);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCurrentWordChange = useCallback((word: string) => setCurrentWord(word), []);

  // When actively dragging, show the live word
  useEffect(() => {
    if (currentWord) {
      setDisplayWord(currentWord);
      setWordFeedback(null);
      setIsFading(false);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    }
  }, [currentWord]);

  // When feedback arrives, show the submitted word with feedback color then fade
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
  }, [feedback]);
  const colors = computeFeedbackColors(boardStyle.colorWash);
  
  const renderPicker = (label: string, options: string[], activeIndex: number, onChange: (i: number) => void) => (
    <div className="board-style-row">
      <div className="board-style-label">{label}</div>
      <div className="board-style-switcher">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`board-style-btn ${i === activeIndex ? 'active' : ''}`}
            onClick={() => onChange(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="game-screen" style={{ '--board-size': boardSize } as React.CSSProperties}>
      <div className="timer-section">
        <div className="timer-display">{timeRemaining > 0 ? `${timeRemaining}s` : '∞'}</div>
        <TimerBar game={game} />
        <button onClick={onEndGame} className="icon-button end-game-icon" aria-label="End game">
          ✕
        </button>
      </div>
      
      <div className="board-container">
        <div className="board-with-word">
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

      <div className="board-footer">
        <button className="mute-toggle" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
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

      <div className={`current-word ${wordFeedback ? `feedback-${wordFeedback}` : ''} ${wordFeedback === 'valid' ? (VALID_ANIM_STYLES[boardStyle.validAnim] || '') : ''} ${isFading ? 'fading' : ''}`} style={{
        '--color-valid': colors.valid,
        '--color-invalid': colors.invalid,
        '--color-duplicate': colors.duplicate,
      } as React.CSSProperties}>
        {wordFeedback === 'valid' && boardStyle.validAnim === 3
          ? displayWord.split('').map((letter, i) => (
              <span key={i} className="wave-letter" style={{ animationDelay: `${i * 0.04}s` }}>{letter}</span>
            ))
          : displayWord
        }
      </div>

      {showBoardStylePicker && (
        <div className="board-style-picker">
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
              <div className="board-style-row">
                <div className="board-style-label">Proximity Radius — {boardStyle.preactRadius}%</div>
                <div className="color-wash-control">
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={boardStyle.preactRadius}
                    onChange={(e) => onBoardStyleChange({ ...boardStyle, preactRadius: parseInt(e.target.value) })}
                    className="color-wash-slider"
                  />
                  <div className="color-wash-range-labels">
                    <span>Near</span>
                    <span>Far</span>
                  </div>
                </div>
              </div>
              <div className="board-style-row">
                <div className="board-style-label">Intensity — {boardStyle.preactIntensity}%</div>
                <div className="color-wash-control">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={boardStyle.preactIntensity}
                    onChange={(e) => onBoardStyleChange({ ...boardStyle, preactIntensity: parseInt(e.target.value) })}
                    className="color-wash-slider"
                  />
                  <div className="color-wash-range-labels">
                    <span>Subtle</span>
                    <span>Strong</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="board-style-row">
            <div className="board-style-label">Feedback Colors — {boardStyle.colorWash}% wash</div>
            <div className="color-wash-control">
              <div className="color-wash-previews">
                <div className="color-wash-swatch" style={{ backgroundColor: colors.selected }} title="Selected" />
                <div className="color-wash-swatch" style={{ backgroundColor: colors.valid }} title="Valid" />
                <div className="color-wash-swatch" style={{ backgroundColor: colors.invalid }} title="Invalid" />
                <div className="color-wash-swatch" style={{ backgroundColor: colors.duplicate }} title="Duplicate" />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={boardStyle.colorWash}
                onChange={(e) => onBoardStyleChange({ ...boardStyle, colorWash: parseInt(e.target.value) })}
                className="color-wash-slider"
              />
              <div className="color-wash-range-labels">
                <span>Vivid</span>
                <span>Washed</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
