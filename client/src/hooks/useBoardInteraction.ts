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

  const getIntermediateCells = (from: Position, to: Position): Position[] => {
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;
    const absDRow = Math.abs(dRow);
    const absDCol = Math.abs(dCol);

    // Check if cells are on a straight line (horizontal, vertical, or diagonal)
    const isHorizontal = dRow === 0 && absDCol > 0;
    const isVertical = dCol === 0 && absDRow > 0;
    const isDiagonal = absDRow === absDCol && absDRow > 0;

    if (!isHorizontal && !isVertical && !isDiagonal) return [];

    const steps = Math.max(absDRow, absDCol);
    const stepRow = dRow === 0 ? 0 : dRow / steps;
    const stepCol = dCol === 0 ? 0 : dCol / steps;

    const cells: Position[] = [];
    for (let i = 1; i <= steps; i++) {
      const r = from.row + stepRow * i;
      const c = from.col + stepCol * i;
      if (r >= 0 && r < board.length && c >= 0 && c < board[0].length) {
        cells.push({ row: r, col: c });
      }
    }

    return cells;
  };

  const addCellToPath = (row: number, col: number) => {
    setCurrentPath(path => {
      const lastPos = path[path.length - 1];
      if (!lastPos) return path;

      const cellIndexInPath = path.findIndex(p => p.row === row && p.col === col);
      if (cellIndexInPath !== -1) {
        return path.slice(0, cellIndexInPath + 1);
      }

      const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
      if (isAdjacent) {
        return [...path, { row, col }];
      }

      const intermediate = getIntermediateCells(lastPos, { row, col });
      if (intermediate.length === 0) return path;

      let newPath = [...path];
      for (const cell of intermediate) {
        if (newPath.some(p => p.row === cell.row && p.col === cell.col)) return path;
        newPath.push(cell);
      }

      return newPath;
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
