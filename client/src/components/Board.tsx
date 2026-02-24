import { useState } from 'react';
import { Board as BoardType, Position } from 'models';

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
}

export const Board = ({ board, onSubmitWord }: BoardProps) => {
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
    
    // Check if adjacent
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    // Check if already in path
    const alreadyInPath = currentPath.some(p => p.row === row && p.col === col);
    if (alreadyInPath) return;
    
    // Determine if this is a diagonal or orthogonal move
    const isDiagonal = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonal = (lastPos.row === row) || (lastPos.col === col);
    
    // If we have mouse tracking, check movement direction
    if (lastMousePos) {
      const currentMousePos = { x: e.clientX, y: e.clientY };
      const deltaX = currentMousePos.x - lastMousePos.x;
      const deltaY = currentMousePos.y - lastMousePos.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Determine if the cursor is moving diagonally based on movement ratios
      const isMovingDiagonally = Math.min(absDeltaX, absDeltaY) / Math.max(absDeltaX, absDeltaY) > 0.3;
      
      // If moving diagonally but hit an orthogonal cell, delay selection
      if (isMovingDiagonally && isOrthogonal) {
        // Store this as a pending cell with timestamp
        setPendingCell({ row, col, timestamp: Date.now() });
        
        // Set a short timeout to clear the pending cell if we don't move to a diagonal
        setTimeout(() => {
          setPendingCell(prev => {
            // Only clear if it's the same cell and enough time has passed
            if (prev && prev.row === row && prev.col === col && Date.now() - prev.timestamp >= 100) {
              // User stayed on orthogonal cell, select it
              setCurrentPath(path => [...path, { row, col }]);
              setLastMousePos(currentMousePos);
              return null;
            }
            return prev;
          });
        }, 100);
        return;
      }
      
      // If we enter a diagonal cell, clear any pending orthogonal selection
      if (isDiagonal && pendingCell) {
        setPendingCell(null);
      }
    }
    
    // Add the cell to the path
    setCurrentPath([...currentPath, { row, col }]);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    if (isDragging && currentPath.length > 0) {
      onSubmitWord(currentPath);
    }
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
    setCurrentPath([]);
  };

  const handlePointerLeave = () => {
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

  return (
    <>
      <div 
        className="board" 
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${isInCurrentPath(rowIndex, colIndex) ? 'selected' : ''}`}
                onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
                onPointerEnter={(e) => handleCellPointerEnter(rowIndex, colIndex, e)}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="current-word">
        {getCurrentWord() || 'Drag to select letters'}
      </div>
    </>
  );
};
