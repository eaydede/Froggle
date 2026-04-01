import { useEffect, useState } from 'react';
import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';
import { useThockSound } from '../hooks/useThockSound';

export type FeedbackType = 'valid' | 'invalid' | 'duplicate' | null;

export const BASE_LABELS = ['Soft Cards', 'Frosted', 'Flat Minimal', 'Neumorphic'];
export const HOVER_LABELS = ['Shadow Lift', 'BG Tint', 'Darken', 'Neu Press'];
export const PRESS_LABELS = ['Glow', 'Flat', 'Subtle', 'Inset'];
export const PREACT_LABELS = ['None', 'Depress', 'Shadow', 'Color Bleed', 'Dim', 'Depress + Bleed'];
export const VALID_ANIM_STYLES = ['valid-bounce', 'valid-pulse', 'valid-slide', 'valid-wave'];
export const VALID_ANIM_LABELS = ['Bounce Up', 'Gentle Pulse', 'Slide Up', 'Letter Wave'];

// --- Style configs as data ---

interface BoardStyleConfig {
  board: React.CSSProperties;
  rowGap: string;
  cell: React.CSSProperties;
}

const BASE_CONFIGS: BoardStyleConfig[] = [
  { // Soft Cards
    board: { background: 'transparent', padding: 0, gap: '8px' },
    rowGap: '8px',
    cell: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)', color: '#333' },
  },
  { // Frosted
    board: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '20px', padding: '14px', gap: '10px' },
    rowGap: '10px',
    cell: { backgroundColor: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: '#333' },
  },
  { // Flat Minimal
    board: { background: 'transparent', padding: 0, gap: '8px' },
    rowGap: '8px',
    cell: { backgroundColor: '#EDECEA', borderRadius: '12px', color: '#333' },
  },
  { // Neumorphic
    board: { backgroundColor: '#EDECEA', borderRadius: '20px', padding: '16px', gap: '10px', boxShadow: '8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.9)' },
    rowGap: '10px',
    cell: { backgroundColor: '#EDECEA', borderRadius: '12px', color: '#333', boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.8)' },
  },
];

function getHoverStyle(hoverIndex: number): React.CSSProperties {
  switch (hoverIndex) {
    case 0: return { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' };
    case 1: return { backgroundColor: '#f5f8ff' };
    case 2: return { backgroundColor: '#E0DFDD' };
    case 3: return { boxShadow: '2px 2px 4px rgba(0,0,0,0.1), -2px -2px 4px rgba(255,255,255,0.8)' };
    default: return {};
  }
}

function getPressStyle(pressIndex: number, selectedColor: string): React.CSSProperties {
  const base: React.CSSProperties = { backgroundColor: selectedColor, color: 'white' };
  switch (pressIndex) {
    case 0: return { ...base, boxShadow: '0 4px 14px rgba(0,0,0,0.2)', transform: 'scale(1.05)' };
    case 1: return { ...base, boxShadow: 'none', transform: 'scale(1.05)' };
    case 2: return { ...base, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transform: 'scale(1.05)' };
    case 3: return { ...base, boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.1)', transform: 'scale(1.02)' };
    default: return base;
  }
}

function getFeedbackStyle(type: FeedbackType, colors: Record<string, string>): React.CSSProperties {
  if (!type) return {};
  const colorMap: Record<string, string> = { valid: colors.valid, invalid: colors.invalid, duplicate: colors.duplicate };
  return { backgroundColor: colorMap[type], color: 'white', transform: 'scale(1.05)' };
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

  const baseConfig = BASE_CONFIGS[baseStyleIndex] || BASE_CONFIGS[0];
  const colors = computeFeedbackColors(colorWash);

  function getCellStyle(rowIndex: number, colIndex: number): React.CSSProperties {
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    const isSelected = isInCurrentPath(rowIndex, colIndex);
    const isHovered = hoveredCell === `${rowIndex},${colIndex}`;
    const { proximity, angle } = getCellProximity(rowIndex, colIndex);

    let style: React.CSSProperties = { ...baseConfig.cell };

    if (isHovered && !isSelected && !feedbackState) {
      Object.assign(style, getHoverStyle(hoverStyleIndex));
    }

    if (!isSelected && !feedbackState) {
      Object.assign(style, getProximityStyle(proximity, angle, preactStyleIndex, preactIntensity / 100));
    }

    if (isSelected && !feedbackState) {
      Object.assign(style, getPressStyle(pressStyleIndex, colors.selected));
    }

    if (feedbackState) {
      Object.assign(style, getFeedbackStyle(feedbackState, colors));
    }

    return style;
  }

  return (
    <div
      ref={boardRef}
      className="flex flex-col select-none touch-none w-full aspect-square box-border"
      style={baseConfig.board}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerLeave={() => { handleBoardPointerLeave(); setHoveredCell(null); }}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-1" style={{ gap: baseConfig.rowGap }}>
          {row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="flex-1 flex items-center justify-center font-mono font-black cursor-pointer select-none border-none transition-all duration-[50ms]"
              style={{
                fontSize: `calc(min(32px, (100vw - 100px) / var(--board-size, 4) * 0.4))`,
                ...getCellStyle(rowIndex, colIndex),
              }}
              data-row={rowIndex}
              data-col={colIndex}
              onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
              onPointerEnter={() => setHoveredCell(`${rowIndex},${colIndex}`)}
              onPointerLeave={() => setHoveredCell(null)}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
