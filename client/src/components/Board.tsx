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

  const getCellStyle = (rowIndex: number, colIndex: number) => {
    const base = 'flex-1 aspect-square m-1 flex items-center justify-center font-bold border-2 border-gray-300 rounded-lg cursor-pointer transition-all duration-200 select-none bg-white';
    const hover = 'hover:bg-blue-50';
    
    let state = '';
    
    // Check feedback first (has priority over selected state)
    const feedbackState = isInFeedbackPath(rowIndex, colIndex);
    if (feedbackState === 'valid') {
      state = '!bg-green-500 text-white scale-110';
    } else if (feedbackState === 'invalid') {
      state = '!bg-red-500 text-white scale-110';
    } else if (feedbackState === 'duplicate') {
      state = '!bg-yellow-400 text-white scale-110';
    } else if (isInCurrentPath(rowIndex, colIndex)) {
      state = '!bg-blue-500 text-white scale-110';
    }
    
    return `${base} ${hover} ${state}`;
  };

  return (
    <div 
      className="inline-flex flex-col w-full aspect-square border-2 border-gray-800 rounded-lg p-2 bg-gray-100 select-none touch-none box-border"
      onPointerUp={handleBoardPointerUp}
      onPointerLeave={handleBoardPointerLeave}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex-1 flex">
          {row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellStyle(rowIndex, colIndex)}
              style={{
                fontSize: `calc(min(32px, (100vw - 120px) / var(--board-size, 4) * 0.4))`,
              }}
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
