import { useState, useEffect } from 'react';
import { Position } from 'models';
import { Cell } from '../../../shared/components/Cell';

interface ResultsBoardProps {
  board: string[][];
  highlightPath: Position[] | null;
  minimized?: boolean;
}

export const ResultsBoard = ({ board, highlightPath, minimized = false }: ResultsBoardProps) => {
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

  const isHighlighted = (row: number, col: number) => animatedCells.has(`${row},${col}`);

  const gap = minimized
    ? boardSize >= 6 ? '3px' : boardSize >= 5 ? '4px' : '5px'
    : boardSize >= 6 ? '5px' : '8px';

  return (
    <div
      className="flex flex-col bg-transparent border-none p-0 max-w-[500px] aspect-square box-border"
      style={{ containerType: 'inline-size', '--board-size': boardSize, gap } as React.CSSProperties}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-1" style={{ gap }}>
          {row.map((letter, colIndex) => {
            const highlighted = isHighlighted(rowIndex, colIndex);
            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                letter={letter}
                state={highlighted ? 'selected' : 'default'}
                size="responsive"
                variant="simple"
                styleOverride={{
                  borderRadius: minimized ? '4px' : '12px',
                  transitionDuration: '150ms',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
