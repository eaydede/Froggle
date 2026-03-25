import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';

export type FeedbackType = 'valid' | 'invalid' | 'duplicate' | null;

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[] } | null;
}

export const Board = ({ board, onSubmitWord, feedback }: BoardProps) => {
  const {
    boardRef,
    handleCellPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  } = useBoardInteraction({ onSubmitWord, feedback });

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

  return (
    <div 
      ref={boardRef}
      className="board" 
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerLeave={handleBoardPointerLeave}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              data-row={rowIndex}
              data-col={colIndex}
              onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
