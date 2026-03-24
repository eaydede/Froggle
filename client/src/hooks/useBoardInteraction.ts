import { useState, useRef, useCallback } from 'react';
import { Board, Position } from 'models';
import { FeedbackType } from '../components/Board';

interface UseBoardInteractionProps {
  board: Board;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  debugMode?: boolean;
}

const DIAGONAL_THRESHOLD = 0.5;

export const useBoardInteraction = ({ board, onSubmitWord, feedback, debugMode = false }: UseBoardInteractionProps) => {
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number; timestamp: number } | null>(null);
  const [debugHistory, setDebugHistory] = useState<any[]>([]);
  const [coordLog, setCoordLog] = useState<Array<{ x: number; y: number; source: string; timestamp: number }>>([]);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);

  const handleCellPointerDown = (row: number, col: number, e: React.PointerEvent) => {
    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    setLastMousePos(null);
    setDebugHistory([]);
    lastCellRef.current = { row, col };
    if (debugMode) {
      setCoordLog([]);
    }
  };

  const handleCellPointerLeave = (e: React.PointerEvent) => {
    if (!isDragging) return;
    // Capture mouse position when leaving a cell
    const pos = { x: e.clientX, y: e.clientY };
    setLastMousePos(pos);
    
    if (debugMode) {
      setCoordLog(prev => [...prev, { ...pos, source: 'handleCellPointerLeave', timestamp: Date.now() }]);
    }
  };

  const handleCellPointerEnter = (row: number, col: number, e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const lastPos = currentPath[currentPath.length - 1];
    if (!lastPos) return;
    
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    const currentMousePos = { x: e.clientX, y: e.clientY };
    
    // If we don't have a lastMousePos, use the current entry point as the start
    // This handles the first move or cases where pointerLeave didn't fire
    const effectiveLastMousePos = lastMousePos || currentMousePos;
    const isDiagonalCell = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonalCell = lastPos.row === row || lastPos.col === col;
    
    // Calculate movement direction from last mouse position (from leaving previous cell)
    let isMovingDiagonally = false;
    let deltaX = 0;
    let deltaY = 0;
    let ratio = 0;
    
    if (effectiveLastMousePos) {
      deltaX = Math.abs(currentMousePos.x - effectiveLastMousePos.x);
      deltaY = Math.abs(currentMousePos.y - effectiveLastMousePos.y);
      const maxDelta = Math.max(deltaX, deltaY);
      ratio = maxDelta > 0 ? Math.min(deltaX, deltaY) / maxDelta : 0;
      isMovingDiagonally = ratio > DIAGONAL_THRESHOLD;
      
      // Update debug history
      if (debugMode) {
        const fromCell = lastPos ? { row: lastPos.row, col: lastPos.col, letter: board[lastPos.row][lastPos.col] } : null;
        const toCell = { row, col, letter: board[row][col] };
        
        // Determine movement direction
        let movementDirection: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal';
        if (!isMovingDiagonally) {
          // Straight movement - check if horizontal or vertical based on mouse deltas
          movementDirection = deltaX > deltaY ? 'horizontal' : 'vertical';
        }
        
        // Capture path state before this move
        const pathBeforeMove = currentPath.map(p => board[p.row][p.col]).join('');
        
        const newDebugInfo = {
          lastMousePos: effectiveLastMousePos,
          currentMousePos,
          deltaX,
          deltaY,
          ratio,
          isMovingDiagonally,
          isDiagonalCell,
          isOrthogonalCell,
          movementDirection,
          threshold: DIAGONAL_THRESHOLD,
          timestamp: Date.now(),
          cellCoords: { row, col },
          fromCell,
          toCell,
          wasPending: false, // Will be updated if delayed
          pathAction: 'pending' as 'added' | 'skipped' | 'backtracked' | 'pending', // Will be updated
          pathBeforeMove, // Path before this cell interaction
          pathAfterMove: '', // Will be updated when path changes
          // Track where coordinates came from
          startSource: 'handleCellPointerLeave',
          endSource: 'handleCellPointerEnter',
        };
        setDebugHistory(prev => [...prev, newDebugInfo]);
      }
    }
    
    if (isMovingDiagonally && isOrthogonalCell) {
      setPendingCell({ row, col, timestamp: Date.now() });
      
      // Mark as pending in debug history
      if (debugMode) {
        setDebugHistory(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].wasPending = true;
          }
          return updated;
        });
      }
      
      setTimeout(() => {
        setPendingCell(prev => {
          if (prev && prev.row === row && prev.col === col && Date.now() - prev.timestamp >= 100) {
            setCurrentPath(path => {
              const cellIndexInPath = path.findIndex(p => p.row === row && p.col === col);
              const isBacktracking = cellIndexInPath !== -1;
              
              if (isBacktracking) {
                const newPath = path.slice(0, cellIndexInPath + 1);
                // Mark as backtracked in debug history
                if (debugMode) {
                  setDebugHistory(prev => {
                    const updated = [...prev];
                    const debugEntry = updated.find(d => d.cellCoords?.row === row && d.cellCoords?.col === col);
                    if (debugEntry) {
                      debugEntry.pathAction = 'backtracked';
                      debugEntry.pathAfterMove = newPath.map(p => board[p.row][p.col]).join('');
                    }
                    return updated;
                  });
                }
                return newPath;
              } else {
                const newPath = [...path, { row, col }];
                // Mark as added to path in debug history
                if (debugMode) {
                  setDebugHistory(prev => {
                    const updated = [...prev];
                    const debugEntry = updated.find(d => d.cellCoords?.row === row && d.cellCoords?.col === col);
                    if (debugEntry) {
                      debugEntry.pathAction = 'added';
                      debugEntry.pathAfterMove = newPath.map(p => board[p.row][p.col]).join('');
                    }
                    return updated;
                  });
                }
                return newPath;
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
      // Mark the pending cell as skipped since we moved to diagonal before it resolved
      if (debugMode) {
        setDebugHistory(prev => {
          const updated = [...prev];
          const debugEntry = updated.find(d => 
            d.cellCoords?.row === pendingCell.row && d.cellCoords?.col === pendingCell.col
          );
          if (debugEntry && debugEntry.pathAction === 'pending') {
            debugEntry.pathAction = 'skipped';
          }
          return updated;
        });
      }
      setPendingCell(null);
    }
    
    const cellIndexInPath = currentPath.findIndex(p => p.row === row && p.col === col);
    const isBacktracking = cellIndexInPath !== -1;
    
    if (isBacktracking) {
      const newPath = currentPath.slice(0, cellIndexInPath + 1);
      // Mark as backtracked in debug history
      if (debugMode) {
        setDebugHistory(prev => {
          const updated = [...prev];
          const debugEntry = updated.find(d => d.cellCoords?.row === row && d.cellCoords?.col === col);
          if (debugEntry) {
            debugEntry.pathAction = 'backtracked';
            debugEntry.pathAfterMove = newPath.map(p => board[p.row][p.col]).join('');
          }
          return updated;
        });
      }
      setCurrentPath(newPath);
      setPendingCell(null);
    } else {
      const newPath = [...currentPath, { row, col }];
      // Mark as added to path in debug history
      if (debugMode) {
        setDebugHistory(prev => {
          const updated = [...prev];
          const debugEntry = updated.find(d => d.cellCoords?.row === row && d.cellCoords?.col === col);
          if (debugEntry) {
            debugEntry.pathAction = 'added';
            debugEntry.pathAfterMove = newPath.map(p => board[p.row][p.col]).join('');
          }
          return updated;
        });
      }
      setCurrentPath(newPath);
    }
    
    // Update lastMousePos to current entry point for next move's trajectory calculation
    setLastMousePos(currentMousePos);
    
    if (debugMode) {
      setCoordLog(prev => [...prev, { ...currentMousePos, source: 'handleCellPointerEnter (end)', timestamp: Date.now() }]);
    }
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

    // Synthesize the pointer enter for this cell
    handleCellPointerEnter(cell.row, cell.col, e);
  };

  const handleBoardPointerUp = () => {
    if (isDragging && currentPath.length > 0) {
      onSubmitWord(currentPath);
    }
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
    setCurrentPath([]);
    lastCellRef.current = null;
  };

  const handleBoardPointerLeave = () => {
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
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
    handleCellPointerLeave,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
    debugHistory,
    pendingCell,
    coordLog,
  };
};
