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
    handleCellPointerDown,
    handleCellPointerEnter,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    isInFeedbackPath,
  } = useBoardInteraction({ board, onSubmitWord, feedback });

  const getCellClassName = (rowIndex: number, colIndex: number) => {
    const classes = ['cell'];
    
    if (isInCurrentPath(rowIndex, colIndex)) {
      classes.push('selected');
    }
    
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    if (feedbackState) {
      classes.push(`feedback-${feedbackState}`);
    }
    
    return classes.join(' ');
  };

  return (
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
              className={getCellClassName(rowIndex, colIndex)}
              onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
              onPointerEnter={(e) => handleCellPointerEnter(rowIndex, colIndex, e)}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
