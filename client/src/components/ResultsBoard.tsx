import { useState, useEffect } from 'react';
import { Position } from 'models';

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
      style={{ '--board-size': boardSize, gap } as React.CSSProperties}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex flex-1" style={{ gap }}>
          {row.map((letter, colIndex) => {
            const highlighted = isHighlighted(rowIndex, colIndex);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="flex-1 flex items-center justify-center font-mono font-black select-none transition-all duration-150"
                style={{
                  fontSize: `calc(min(32px, (100vw - 100px) / var(--board-size, 4) * 0.4))`,
                  backgroundColor: highlighted ? 'var(--color-selected, #7BA7C9)' : 'white',
                  color: highlighted ? 'white' : '#333',
                  borderRadius: minimized ? '4px' : '12px',
                  boxShadow: highlighted
                    ? 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                  transform: highlighted ? 'scale(1.02)' : undefined,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
