import { useEffect, useState } from 'react';
import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';
import { useThockSound } from '../hooks/useThockSound';
import { Cell } from '../../../shared/components/Cell';
import type { CellState } from '../../../shared/components/Cell';

export type FeedbackType = 'valid' | 'invalid' | 'duplicate' | null;

// --- Board layout configs ---

interface BoardLayoutConfig {
  board: React.CSSProperties;
  rowGap: string;
}

const BOARD_LAYOUTS: BoardLayoutConfig[] = [
  { // Soft Cards
    board: { background: 'transparent', padding: 0, gap: '8px' },
    rowGap: '8px',
  },
  { // Frosted
    board: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '20px', padding: '14px', gap: '10px' },
    rowGap: '10px',
  },
  { // Flat Minimal
    board: { background: 'transparent', padding: 0, gap: '8px' },
    rowGap: '8px',
  },
  { // Neumorphic
    board: { backgroundColor: '#EDECEA', borderRadius: '20px', padding: '16px', gap: '10px', boxShadow: '8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.9)' },
    rowGap: '10px',
  },
];

// --- Hover styles ---

function getHoverStyle(hoverIndex: number): React.CSSProperties {
  switch (hoverIndex) {
    case 0: return { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' };
    case 1: return { backgroundColor: '#f5f8ff' };
    case 2: return { backgroundColor: '#E0DFDD' };
    case 3: return { boxShadow: '2px 2px 4px rgba(0,0,0,0.1), -2px -2px 4px rgba(255,255,255,0.8)' };
    default: return {};
  }
}

// --- Proximity ---

function getProximityStyle(
  proximity: number, angle: number, preactStyle: number, intensity: number
): React.CSSProperties {
  if (proximity === 0 || preactStyle === 0) return {};
  const p = Math.pow(proximity, 1.5);
  const gradDir = (angle + 270) % 360;
  const colorStop = Math.round(p * 50 * intensity);
  const fadeStop = Math.min(100, colorStop + 30);
  const bleedColor = `rgba(0,0,0,${(p * 0.08 * intensity).toFixed(3)})`;
  const scaleAmount = p * 0.15 * intensity;

  switch (preactStyle) {
    case 1: return { transform: `scale(${1 - scaleAmount})` };
    case 2: return { boxShadow: `0 ${Math.round((1 - p * intensity) * 4)}px ${Math.round((1 - p * intensity) * 8)}px rgba(0,0,0,${0.08 * (1 - p * intensity)})` };
    case 3: return { background: `linear-gradient(${gradDir}deg, ${bleedColor} ${colorStop}%, transparent ${fadeStop}%)` };
    case 4: return { filter: `brightness(${1 - p * 0.3 * intensity})` };
    case 5: return { transform: `scale(${1 - scaleAmount * 0.7})`, background: `linear-gradient(${gradDir}deg, ${bleedColor} ${colorStop}%, transparent ${fadeStop}%)` };
    default: return {};
  }
}

// --- Color computation ---

const COLOR_RANGES = {
  selected: { vivid: [207, 90, 54], washed: [207, 25, 72] },
  valid: { vivid: [122, 39, 49], washed: [122, 18, 65] },
  invalid: { vivid: [4, 90, 58], washed: [4, 30, 68] },
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

// --- Component ---

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  baseStyleIndex?: number;
  hoverStyleIndex?: number;
  pressStyleIndex?: number;
  soundIndex?: number;
  colorWash?: number;
  preactStyleIndex?: number;
  preactRadius?: number;
  preactIntensity?: number;
  onCurrentWordChange?: (word: string) => void;
}

export const Board = ({
  board, onSubmitWord, feedback,
  baseStyleIndex = 0, hoverStyleIndex = 0, pressStyleIndex = 3,
  soundIndex = 0, colorWash = 35,
  preactStyleIndex = 0, preactRadius = 130, preactIntensity = 100,
  onCurrentWordChange,
}: BoardProps) => {
  const playThock = useThockSound(soundIndex);
  const {
    boardRef, currentPath, clearPath,
    handleCellPointerDown, handleBoardPointerMove,
    handleBoardPointerUp, handleBoardPointerLeave,
    isInCurrentPath, isInFeedbackPath, getCellProximity,
  } = useBoardInteraction({ onSubmitWord, feedback, onCellSelected: playThock, proximityRadius: preactRadius / 100 });

  const currentWord = currentPath.map(p => board[p.row]?.[p.col] || '').join('');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => { onCurrentWordChange?.(currentWord); }, [currentWord, onCurrentWordChange]);
  useEffect(() => { if (feedback) clearPath(); }, [feedback]);

  const layout = BOARD_LAYOUTS[baseStyleIndex] || BOARD_LAYOUTS[0];
  const colors = computeFeedbackColors(colorWash);

  function getCellState(rowIndex: number, colIndex: number): CellState {
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    if (feedbackState === 'valid') return 'valid';
    if (feedbackState === 'invalid') return 'invalid';
    if (feedbackState === 'duplicate') return 'duplicate';
    if (isInCurrentPath(rowIndex, colIndex)) return 'selected';
    return 'default';
  }

  function getDynamicOverride(rowIndex: number, colIndex: number): React.CSSProperties {
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    const isSelected = isInCurrentPath(rowIndex, colIndex);
    const isHovered = hoveredCell === `${rowIndex},${colIndex}`;
    const { proximity, angle } = getCellProximity(rowIndex, colIndex);

    let override: React.CSSProperties = {};

    if (isHovered && !isSelected && !feedbackState) {
      Object.assign(override, getHoverStyle(hoverStyleIndex));
    }

    if (!isSelected && !feedbackState) {
      Object.assign(override, getProximityStyle(proximity, angle, preactStyleIndex, preactIntensity / 100));
    }

    return override;
  }

  return (
    <div
      ref={boardRef}
      className="flex flex-col select-none touch-none w-full aspect-square box-border"
      style={{
        containerType: 'inline-size',
        ...layout.board,
        // Override CSS variables with computed wash colors so Cell picks them up
        '--color-selected': colors.selected,
        '--color-valid': colors.valid,
        '--color-invalid': colors.invalid,
        '--color-duplicate': colors.duplicate,
      } as React.CSSProperties}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerLeave={() => { handleBoardPointerLeave(); setHoveredCell(null); }}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-1" style={{ gap: layout.rowGap }}>
          {row.map((letter, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              letter={letter}
              state={getCellState(rowIndex, colIndex)}
              size="responsive"
              variant="dice"
              styleOverride={getDynamicOverride(rowIndex, colIndex)}
              className="cursor-pointer"
              data-row={rowIndex}
              data-col={colIndex}
              onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
              onPointerEnter={() => setHoveredCell(`${rowIndex},${colIndex}`)}
              onPointerLeave={() => setHoveredCell(null)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
