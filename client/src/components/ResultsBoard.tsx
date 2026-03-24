import { useState, useEffect } from 'react';
import { Position } from 'models';

interface ResultsBoardProps {
  board: string[][];
  highlightPath: Position[] | null;
}

export const ResultsBoard = ({ board, highlightPath }: ResultsBoardProps) => {
  const [animatedCells, setAnimatedCells] = useState<Set<string>>(new Set());
  const boardSize = board.length;

  useEffect(() => {
    setAnimatedCells(new Set());

    if (!highlightPath || highlightPath.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];

    highlightPath.forEach((pos, index) => {
      const timeout = setTimeout(() => {
        setAnimatedCells(prev => {
          const next = new Set(prev);
          next.add(`${pos.row},${pos.col}`);
          return next;
        });
      }, index * 80);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [highlightPath]);

  const isHighlighted = (row: number, col: number) => {
    return animatedCells.has(`${row},${col}`);
  };

  return (
    <div 
      className="results-board" 
      style={{ '--board-size': boardSize } as React.CSSProperties}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="results-board-row">
          {row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`results-cell ${isHighlighted(rowIndex, colIndex) ? 'results-cell-highlighted' : ''}`}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
