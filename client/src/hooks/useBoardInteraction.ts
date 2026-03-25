import { useState, useRef, useCallback } from 'react';
import { Board, Position } from 'models';
import { FeedbackType } from '../components/Board';

interface UseBoardInteractionProps {
  board: Board;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  dwellTime: number;
}

export const useBoardInteraction = ({ board, onSubmitWord, feedback, dwellTime }: UseBoardInteractionProps) => {
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCellRef = useRef<{ row: number; col: number } | null>(null);

  const clearDwellTimer = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    pendingCellRef.current = null;
  };

  const addCellToPath = (row: number, col: number) => {
    setCurrentPath(path => {
      const lastPos = path[path.length - 1];
      if (!lastPos) return path;

      const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
      if (!isAdjacent) return path;

      const cellIndexInPath = path.findIndex(p => p.row === row && p.col === col);

      if (cellIndexInPath !== -1) {
        return path.slice(0, cellIndexInPath + 1);
      }

      return [...path, { row, col }];
    });
  };

  const handleCellPointerDown = (row: number, col: number, _e: React.PointerEvent) => {
    clearDwellTimer();
    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    lastCellRef.current = { row, col };
  };

  const handleCellPointerEnter = (row: number, col: number, _e: React.PointerEvent) => {
    if (!isDragging) return;

    clearDwellTimer();
    pendingCellRef.current = { row, col };

    if (dwellTime <= 0) {
      addCellToPath(row, col);
      return;
    }

    dwellTimerRef.current = setTimeout(() => {
      if (pendingCellRef.current?.row === row && pendingCellRef.current?.col === col) {
        addCellToPath(row, col);
        pendingCellRef.current = null;
      }
    }, dwellTime);
  };

  const getCellFromPoint = useCallback((x: number, y: number): { row: number; col: number } | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const cell = element.closest('[data-row][data-col]') as HTMLElement | null;
    if (!cell) return null;
    const row = parseInt(cell.dataset.row!, 10);
    const col = parseInt(cell.dataset.col!, 10);
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
  }, []);

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;

    const last = lastCellRef.current;
    if (last && last.row === cell.row && last.col === cell.col) return;

    lastCellRef.current = cell;
    handleCellPointerEnter(cell.row, cell.col, e);
  };

  const handleBoardPointerUp = () => {
    clearDwellTimer();
    if (isDragging && currentPath.length > 0) {
      onSubmitWord(currentPath);
    }
    setIsDragging(false);
    setCurrentPath([]);
    lastCellRef.current = null;
  };

  const handleBoardPointerLeave = () => {
    clearDwellTimer();
    setIsDragging(false);
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
    currentPath,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  };
};
