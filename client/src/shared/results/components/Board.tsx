import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Position } from 'models';
import type { ResultsBoardConfig } from '../types';

interface BoardProps {
  board: string[][];
  highlightPath: Position[] | null;
  /** CSS color (typically `var(--rarity-*)`) used to tint lit cells so the
   *  animation echoes the rarity stripe of the word being replayed. When
   *  null, lit cells fall back to the neutral ink palette. */
  highlightColor?: string | null;
  config: ResultsBoardConfig;
  compact?: boolean;
  /** Optional bottom-right adornment per cell. Used by the gauntlet
   *  rare-letters round to surface point values on the preview board so
   *  the player can see why words add up to their scores. */
  cellBadge?: (row: number, col: number, letter: string) => ReactNode;
}

const STEP_MS = 70;

export function Board({
  board,
  highlightPath,
  highlightColor = null,
  config,
  compact = false,
  cellBadge,
}: BoardProps) {
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
            const litBackground = highlightColor
              ? `color-mix(in srgb, ${highlightColor} 28%, transparent)`
              : 'var(--ink-trace)';
            const litBorder = highlightColor ?? 'var(--ink-mid)';
            const badge = cellBadge?.(r, c, letter);
            return (
              <div
                key={`${r}-${c}`}
                className={`relative ${compact ? 'rounded-[4px] text-[13px]' : 'rounded-[4px] text-sm'} flex items-center justify-center tabular-nums font-[family-name:var(--font-structure)] transition-[background,border-color,color] duration-150`}
                style={{
                  fontWeight: 700,
                  background: lit ? litBackground : 'var(--surface-card)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: lit ? litBorder : 'var(--ink-border-subtle)',
                  color: lit ? 'var(--ink)' : 'var(--ink-muted)',
                }}
              >
                {letter}
                {badge !== undefined && badge !== null && (
                  <span
                    className="absolute bottom-[1px] right-[2px] leading-none tabular-nums pointer-events-none text-[8px] opacity-60"
                    style={{ fontWeight: 700 }}
                  >
                    {badge}
                  </span>
                )}
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
