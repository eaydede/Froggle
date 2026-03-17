import { useState } from 'react';
import { Board, Position } from 'models';
import { FeedbackType } from '../components/Board';

interface UseBoardInteractionProps {
  board: Board;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
}

export const useBoardInteraction = ({ board, onSubmitWord, feedback }: UseBoardInteractionProps) => {
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number; timestamp: number } | null>(null);

  const handleCellPointerDown = (row: number, col: number, e: React.PointerEvent) => {
    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    setLastMousePos(null); // Reset on new drag
  };

  const handleCellPointerLeave = (e: React.PointerEvent) => {
    if (!isDragging) return;
    // Capture mouse position when leaving a cell
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCellPointerEnter = (row: number, col: number, e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const lastPos = currentPath[currentPath.length - 1];
    if (!lastPos) return;
    
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    const currentMousePos = { x: e.clientX, y: e.clientY };
    const isDiagonalCell = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonalCell = lastPos.row === row || lastPos.col === col;
    
    // Calculate movement direction from last mouse position (from leaving previous cell)
    let isMovingDiagonally = false;
    if (lastMousePos) {
      const deltaX = Math.abs(currentMousePos.x - lastMousePos.x);
      const deltaY = Math.abs(currentMousePos.y - lastMousePos.y);
      isMovingDiagonally = Math.min(deltaX, deltaY) / Math.max(deltaX, deltaY) > 0.5;
    }
    
    if (isMovingDiagonally && isOrthogonalCell) {
      setPendingCell({ row, col, timestamp: Date.now() });
      
      setTimeout(() => {
        setPendingCell(prev => {
          if (prev && prev.row === row && prev.col === col && Date.now() - prev.timestamp >= 100) {
            setCurrentPath(path => {
              const cellIndexInPath = path.findIndex(p => p.row === row && p.col === col);
              const isBacktracking = cellIndexInPath !== -1;
              
              if (isBacktracking) {
                return path.slice(0, cellIndexInPath + 1);
              } else {
                return [...path, { row, col }];
              }
            });
            return null;
          }
          return prev;
        });
      }, 120);
      return;
    }
    
    if (isDiagonalCell && pendingCell) {
      setPendingCell(null);
    }
    
    const cellIndexInPath = currentPath.findIndex(p => p.row === row && p.col === col);
    const isBacktracking = cellIndexInPath !== -1;
    
    if (isBacktracking) {
      setCurrentPath(currentPath.slice(0, cellIndexInPath + 1));
      setPendingCell(null);
    } else {
      setCurrentPath([...currentPath, { row, col }]);
    }
  };

  const handleBoardPointerUp = () => {
    if (isDragging && currentPath.length > 0) {
      onSubmitWord(currentPath);
    }
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
    setCurrentPath([]);
  };

  const handleBoardPointerLeave = () => {
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
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
    handleCellPointerLeave,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  };
};
