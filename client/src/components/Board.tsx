import { Board as BoardType, Position } from 'models';
import { useBoardInteraction } from '../hooks/useBoardInteraction';

interface BoardProps {
  board: BoardType;
  onSubmitWord: (path: Position[]) => void;
}

export const Board = ({ board, onSubmitWord }: BoardProps) => {
  const {
    handleCellPointerDown,
    handleCellPointerEnter,
    handleBoardPointerUp,
    handleBoardPointerLeave,
    isInCurrentPath,
    getCurrentWord,
  } = useBoardInteraction({ board, onSubmitWord });

  return (
    <>
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
