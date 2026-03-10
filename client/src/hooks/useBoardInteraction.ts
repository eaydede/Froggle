import { useState } from 'react';
import { Board, Position } from 'models';

interface UseBoardInteractionProps {
  board: Board;
  onSubmitWord: (path: Position[]) => void;
}

export const useBoardInteraction = ({ board, onSubmitWord }: UseBoardInteractionProps) => {
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number; timestamp: number } | null>(null);

  const handleCellPointerDown = (row: number, col: number, e: React.PointerEvent) => {
    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCellPointerEnter = (row: number, col: number, e: React.PointerEvent) => {
    if (!isDragging) return;
    if (!lastMousePos) return;
    
    const lastPos = currentPath[currentPath.length - 1];
    if (!lastPos) return;
    
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    const currentMousePos = { x: e.clientX, y: e.clientY };
    const isDiagonalCell = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonalCell = lastPos.row === row || lastPos.col === col;
    
    const deltaX = Math.abs(currentMousePos.x - lastMousePos.x);
    const deltaY = Math.abs(currentMousePos.y - lastMousePos.y);
    const isMovingDiagonally = Math.min(deltaX, deltaY) / Math.max(deltaX, deltaY) > 0.3;
    
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
            setLastMousePos(currentMousePos);
            return null;
          }
          return prev;
        });
      }, 100);
      return;
    }
    
    if (isDiagonalCell && pendingCell) {
      setPendingCell(null);
    }
    
    const cellIndexInPath = currentPath.findIndex(p => p.row === row && p.col === col);
    const isBacktracking = cellIndexInPath !== -1;
    
    if (isBacktracking) {
      setCurrentPath(currentPath.slice(0, cellIndexInPath + 1));
      setLastMousePos(currentMousePos);
      setPendingCell(null);
    } else {
      setCurrentPath([...currentPath, { row, col }]);
      setLastMousePos(currentMousePos);
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

  const getCurrentWord = () => {
    return currentPath.map(pos => board[pos.row][pos.col]).join('');
  };

  return {
    currentPath,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    getCurrentWord,
  };
};
