import { useEffect, useState } from 'react';
import type { Position } from 'models';
import type { ResultsBoardConfig } from '../types';

interface BoardProps {
  board: string[][];
  highlightPath: Position[] | null;
  config: ResultsBoardConfig;
  compact?: boolean;
}

const STEP_MS = 70;

export function Board({ board, highlightPath, config, compact = false }: BoardProps) {
  const size = board.length;
  const [animatedCells, setAnimatedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAnimatedCells(new Set());
    if (!highlightPath || highlightPath.length === 0) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    highlightPath.forEach((pos, i) => {
      const t = setTimeout(() => {
        setAnimatedCells((prev) => {
          const next = new Set(prev);
          next.add(`${pos.row},${pos.col}`);
          return next;
        });
      }, i * STEP_MS);
      timeouts.push(t);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [highlightPath]);

  return (
    <div className={`${compact ? 'w-[160px]' : 'w-[168px]'} shrink-0 flex flex-col items-center`}>
      <div
        className="grid w-full aspect-square gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((letter, c) => {
            const lit = animatedCells.has(`${r},${c}`);
            return (
              <div
                key={`${r}-${c}`}
                className={`${compact ? 'rounded-[4px] text-[13px]' : 'rounded-[4px] text-sm'} flex items-center justify-center tabular-nums font-[family-name:var(--font-structure)] transition-[background,border-color,color] duration-150`}
                style={{
                  fontWeight: 700,
                  background: lit ? 'var(--ink-trace)' : 'var(--surface-card)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: lit ? 'var(--ink-mid)' : 'var(--ink-border-subtle)',
                  color: lit ? 'var(--ink)' : 'var(--ink-muted)',
                }}
              >
                {letter}
              </div>
            );
          }),
        )}
      </div>

      <div
        className={`flex justify-center uppercase text-label-xs tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] ${compact ? 'gap-2 mt-2' : 'gap-2 mt-2.5'}`}
        style={{ fontWeight: 600 }}
      >
        <span>{config.boardSize}×{config.boardSize}</span>
        <span className="opacity-50">·</span>
        <span>{formatTimer(config.timeLimit)}</span>
        <span className="opacity-50">·</span>
        <span>min {config.minWordLength}</span>
      </div>
    </div>
  );
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
