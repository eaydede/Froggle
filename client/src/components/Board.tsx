import { useEffect } from 'react';
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

// Vivid HSL values: [hue, saturation, lightness]
// Washed HSL values: lower saturation, higher lightness
const COLOR_RANGES = {
  selected:  { vivid: [207, 90, 54], washed: [207, 25, 72] },
  valid:     { vivid: [122, 39, 49], washed: [122, 18, 65] },
  invalid:   { vivid: [4, 90, 58],   washed: [4, 30, 68] },
  duplicate: { vivid: [45, 100, 51], washed: [45, 30, 68] },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function computeFeedbackColors(wash: number) {
  const t = wash / 100;
  const result: Record<string, string> = {};
  for (const [key, { vivid, washed }] of Object.entries(COLOR_RANGES)) {
    const h = Math.round(lerp(vivid[0], washed[0], t));
    const s = Math.round(lerp(vivid[1], washed[1], t));
    const l = Math.round(lerp(vivid[2], washed[2], t));
    result[key] = `hsl(${h}, ${s}%, ${l}%)`;
  }
  return result;
}

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  baseStyleIndex?: number;
  hoverStyleIndex?: number;
  pressStyleIndex?: number;
  soundIndex?: number;
  colorWash?: number;
}

export const Board = ({ board, onSubmitWord, feedback, baseStyleIndex = 1, hoverStyleIndex = 0, pressStyleIndex = 3, soundIndex = 0, colorWash = 35 }: BoardProps) => {
  const playThock = useThockSound(soundIndex);
  const {
    boardRef,
    clearPath,
    handleCellPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  } = useBoardInteraction({ onSubmitWord, feedback, onCellSelected: playThock });

  // Clear the selection path when feedback arrives (feedback visually takes over)
  useEffect(() => {
    if (feedback) {
      clearPath();
    }
  }, [feedback]);

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
  const colors = computeFeedbackColors(colorWash);

  return (
    <div 
      ref={boardRef}
      className={`board ${baseClass} ${hoverClass} ${pressClass}`}
      style={{
        '--color-selected': colors.selected,
        '--color-valid': colors.valid,
        '--color-invalid': colors.invalid,
        '--color-duplicate': colors.duplicate,
      } as React.CSSProperties}
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
