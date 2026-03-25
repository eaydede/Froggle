import { useState, useRef, useCallback } from 'react';
import { Position } from 'models';
import { FeedbackType } from '../components/Board';

interface UseBoardInteractionProps {
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
}

const CELL_HITBOX_AREA_RATIO = 0.66;
const CELL_HITBOX_SIDE_RATIO = Math.sqrt(CELL_HITBOX_AREA_RATIO);

export const useBoardInteraction = ({ onSubmitWord, feedback }: UseBoardInteractionProps) => {
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);

  const addCellToPath = (row: number, col: number) => {
    setCurrentPath(path => {
      const lastPos = path[path.length - 1];
      if (!lastPos) {
        return [{ row, col }];
      }

      if (lastPos.row === row && lastPos.col === col) {
        return path;
      }

      const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
      if (!isAdjacent) {
        return path;
      }

      const cellIndexInPath = path.findIndex(p => p.row === row && p.col === col);
      if (cellIndexInPath !== -1) {
        return path.slice(0, cellIndexInPath + 1);
      }

      return [...path, { row, col }];
    });
  };

  const getCenteredHitbox = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const hitboxWidth = rect.width * CELL_HITBOX_SIDE_RATIO;
    const hitboxHeight = rect.height * CELL_HITBOX_SIDE_RATIO;
    const hitboxLeft = rect.left + (rect.width - hitboxWidth) / 2;
    const hitboxTop = rect.top + (rect.height - hitboxHeight) / 2;

    return {
      left: hitboxLeft,
      right: hitboxLeft + hitboxWidth,
      top: hitboxTop,
      bottom: hitboxTop + hitboxHeight,
    };
  };

  const isPointInCenteredHitbox = (x: number, y: number, element: HTMLElement) => {
    const hitbox = getCenteredHitbox(element);
    return x >= hitbox.left && x <= hitbox.right && y >= hitbox.top && y <= hitbox.bottom;
  };

  const handleCellPointerDown = (row: number, col: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointInCenteredHitbox(e.clientX, e.clientY, e.currentTarget)) {
      return;
    }

    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    lastCellRef.current = { row, col };
  };

  const getCellFromPoint = useCallback((x: number, y: number): { row: number; col: number } | null => {
    const boardElement = boardRef.current;
    if (!boardElement) return null;

    const cells = boardElement.querySelectorAll<HTMLElement>('[data-row][data-col]');

    for (const cell of cells) {
      if (!isPointInCenteredHitbox(x, y, cell)) continue;

      const row = parseInt(cell.dataset.row ?? '', 10);
      const col = parseInt(cell.dataset.col ?? '', 10);

      if (isNaN(row) || isNaN(col)) return null;

      return { row, col };
    }

    return null;
  }, []);

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;

    const last = lastCellRef.current;
    if (last && last.row === cell.row && last.col === cell.col) return;

    lastCellRef.current = cell;
    addCellToPath(cell.row, cell.col);
  };

  const handleBoardPointerUp = () => {
    if (isDragging && currentPath.length > 0) {
      onSubmitWord(currentPath);
    }
    setIsDragging(false);
    setCurrentPath([]);
    lastCellRef.current = null;
  };

  const handleBoardPointerLeave = () => {
    setIsDragging(false);
    setCurrentPath([]);
    lastCellRef.current = null;
  };

  const isInCurrentPath = (row: number, col: number) => {
    return currentPath.some(p => p.row === row && p.col === col);
  };

  const isInFeedbackPath = (row: number, col: number): FeedbackType => {
    if (!feedback) return null;
    const inPath = feedback.path.some(p => p.row === row && p.col === col);
    return inPath ? feedback.type : null;
  };

  return {
    boardRef,
    currentPath,
    handleCellPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  };
};
