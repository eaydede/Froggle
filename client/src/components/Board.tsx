import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';
import { DebugOverlay } from './DebugOverlay';

export type FeedbackType = 'valid' | 'invalid' | 'duplicate' | null;

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
  debugMode?: boolean;
}

export const Board = ({ board, onSubmitWord, feedback, debugMode = false }: BoardProps) => {
  const {
    currentPath,
    handleCellPointerDown,
    handleCellPointerEnter,
    handleCellPointerLeave,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
    debugHistory,
    pendingCell,
    coordLog,
  } = useBoardInteraction({ board, onSubmitWord, feedback, debugMode });

  const getCellClass = (rowIndex: number, colIndex: number) => {
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    
    if (feedbackState === 'valid') {
      return 'cell selected-valid';
    } else if (feedbackState === 'invalid') {
      return 'cell selected-invalid';
    } else if (feedbackState === 'duplicate') {
      return 'cell selected-duplicate';
    } else if (isInCurrentPath(rowIndex, colIndex)) {
      return 'cell selected';
    }
    
    return 'cell';
  };

  const boardSize = board.length;
  const cellSize = 100 / boardSize;

  return (
    <>
      <DebugOverlay 
        debugHistory={debugHistory} 
        pendingCell={pendingCell} 
        enabled={debugMode}
        boardSize={boardSize}
        cellSize={cellSize}
        board={board}
        coordLog={coordLog}
      />
      <div 
        className="board" 
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerLeave}
      >
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
                onPointerEnter={(e) => handleCellPointerEnter(rowIndex, colIndex, e)}
                onPointerLeave={(e) => handleCellPointerLeave(e)}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="current-word">
        {currentPath.map(p => board[p.row][p.col]).join('')}
      </div>
    </>
  );
};
