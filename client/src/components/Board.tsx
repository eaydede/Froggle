import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';
import { useThockSound } from '../hooks/useThockSound';

export type FeedbackType = 'valid' | 'invalid' | 'duplicate' | null;

export const BASE_STYLES = ['base-soft', 'base-frosted', 'base-flat', 'base-neu'];
export const BASE_LABELS = ['Soft Cards', 'Frosted', 'Flat Minimal', 'Neumorphic'];

export const HOVER_STYLES = ['hover-shadow-lift', 'hover-bg-tint', 'hover-darken', 'hover-neu-press'];
export const HOVER_LABELS = ['Shadow Lift', 'BG Tint', 'Darken', 'Neu Press'];

export const PRESS_STYLES = ['press-glow', 'press-flat', 'press-subtle', 'press-inset'];
export const PRESS_LABELS = ['Glow', 'Flat', 'Subtle', 'Inset'];

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  baseStyleIndex?: number;
  hoverStyleIndex?: number;
  pressStyleIndex?: number;
  soundIndex?: number;
}

export const Board = ({ board, onSubmitWord, feedback, baseStyleIndex = 1, hoverStyleIndex = 0, pressStyleIndex = 3, soundIndex = 0 }: BoardProps) => {
  const playThock = useThockSound(soundIndex);
  const {
    boardRef,
    handleCellPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  } = useBoardInteraction({ onSubmitWord, feedback, onCellSelected: playThock });

  const getCellClass = (rowIndex: number, colIndex: number) => {
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    
    if (feedbackState === 'valid') {
      return 'cell selected-valid';
    } else if (feedbackState === 'invalid') {
      return 'cell selected-invalid';
    } else if (feedbackState === 'duplicate') {
      return 'cell selected-duplicate';
    } else if (isInCurrentPath(rowIndex, colIndex)) {
      return 'cell selected';
    }
    
    return 'cell';
  };

  const baseClass = BASE_STYLES[baseStyleIndex] || BASE_STYLES[0];
  const hoverClass = HOVER_STYLES[hoverStyleIndex] || HOVER_STYLES[0];
  const pressClass = PRESS_STYLES[pressStyleIndex] || PRESS_STYLES[0];

  return (
    <div 
      ref={boardRef}
      className={`board ${baseClass} ${hoverClass} ${pressClass}`}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerLeave={handleBoardPointerLeave}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              data-row={rowIndex}
              data-col={colIndex}
              onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
