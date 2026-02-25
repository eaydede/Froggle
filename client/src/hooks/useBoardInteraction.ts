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
    
    const lastPos = currentPath[currentPath.length - 1];
    if (!lastPos) return;
    
    // Check if adjacent (within 1 cell in any direction)
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    // Check if already in path
    const isInPath = currentPath.some(p => p.row === row && p.col === col);
    if (isInPath) return;
    
    const currentMousePos = { x: e.clientX, y: e.clientY };
    
    // Apply diagonal tolerance if we have mouse tracking
    if (!lastMousePos) {
      // No mouse tracking yet, just add to path
      setCurrentPath([...currentPath, { row, col }]);
      setLastMousePos(currentMousePos);
      return;
    }
    
    const isDiagonal = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonal = lastPos.row === row || lastPos.col === col;
    
    // Check if cursor is moving diagonally
    const deltaX = Math.abs(currentMousePos.x - lastMousePos.x);
    const deltaY = Math.abs(currentMousePos.y - lastMousePos.y);
    const isMovingDiagonally = Math.min(deltaX, deltaY) / Math.max(deltaX, deltaY) > 0.3;
    
    // If cursor is moving diagonally but we hit an orthogonal cell, delay selection
    if (isMovingDiagonally && isOrthogonal) {
      setPendingCell({ row, col, timestamp: Date.now() });
      
      setTimeout(() => {
        setPendingCell(prev => {
          // Only select if user stayed on this cell for 100ms
          if (prev && prev.row === row && prev.col === col && Date.now() - prev.timestamp >= 100) {
            setCurrentPath(path => [...path, { row, col }]);
            setLastMousePos(currentMousePos);
            return null;
          }
          return prev;
        });
      }, 100);
      return;
    }
    
    // If we enter a diagonal cell, cancel any pending orthogonal selection
    if (isDiagonal && pendingCell) {
      setPendingCell(null);
    }
    
    // Add the cell to the path
    setCurrentPath([...currentPath, { row, col }]);
    setLastMousePos(currentMousePos);
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
