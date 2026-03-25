import { Game, Position, Word } from 'models';
import { Board, FeedbackType, BASE_LABELS, HOVER_LABELS, PRESS_LABELS, computeFeedbackColors } from '../components/Board';
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
}

export const GamePage = ({ game, timeRemaining, feedback, onSubmitWord, onEndGame, boardStyle, onBoardStyleChange, showBoardStylePicker }: GamePageProps) => {
  const boardSize = game.board.length;
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
        <div className="timer-display">{timeRemaining > 0 ? `${timeRemaining}s` : 'Unlimited'}</div>
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
            soundIndex={boardStyle.sound}
            colorWash={boardStyle.colorWash}
          />
        </div>
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
