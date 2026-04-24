import { useEffect, useState } from 'react';
import type { Position } from 'models';

interface MiniBoardProps {
  board: string[][];
  /** Cells that should render in the "selected" treatment. Animated in
   *  order so the user sees the path trace itself one cell at a time,
   *  matching the legacy results board behavior. */
  highlightPath?: Position[] | null;
}

const STEP_MS = 80;

export function MiniBoard({ board, highlightPath }: MiniBoardProps) {
  const size = board.length;
  const [animatedCells, setAnimatedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAnimatedCells(new Set());
    if (!highlightPath || highlightPath.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    highlightPath.forEach((pos, index) => {
      const t = setTimeout(() => {
        setAnimatedCells((prev) => {
          const next = new Set(prev);
          next.add(`${pos.row},${pos.col}`);
          return next;
        });
      }, index * STEP_MS);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [highlightPath]);

  return (
    <div
      className="grid w-full aspect-square gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {board.map((row, r) =>
        row.map((letter, c) => {
          const selected = animatedCells.has(`${r},${c}`);
          return (
            <div
              key={`${r}-${c}`}
              className={[
                'rounded-[4px] flex items-center justify-center text-[11px] tabular-nums font-[family-name:var(--font-structure)] transition-[background,border-color,color] duration-150',
                selected
                  ? 'bg-[var(--ink-trace)] border border-[var(--ink-mid)] text-[color:var(--ink)]'
                  : 'bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] text-[color:var(--ink-muted)]',
              ].join(' ')}
              style={{ fontWeight: 700 }}
            >
              {letter}
            </div>
          );
        }),
      )}
    </div>
  );
}
