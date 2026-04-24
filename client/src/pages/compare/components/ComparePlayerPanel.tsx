import { useEffect, useMemo, useState } from 'react';
import type { Position } from 'models';

export type PanelSide = 'you' | 'them';

interface ScoredWord {
  word: string;
  score: number;
}

interface ComparePlayerPanelProps {
  side: PanelSide;
  board: string[][];
  highlightPath: Position[] | null;
  words: ScoredWord[];
  /** Set of words (uppercase) the opponent also found — highlights shared
   *  rows with the muted shared treatment. */
  sharedWords: Set<string>;
  highlightedWord: string | null;
  onWordTap: (word: string) => void;
}

const STEP_MS = 80;

export function ComparePlayerPanel({
  side,
  board,
  highlightPath,
  words,
  sharedWords,
  highlightedWord,
  onWordTap,
}: ComparePlayerPanelProps) {
  const size = board.length;

  // Staggered cell-reveal animation — matches the legacy ResultsBoard
  // behavior so tapping a word traces its path one cell at a time
  // instead of snapping in all at once.
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

  // Sort: unique words first (by score desc), then shared (by score desc) —
  // matches the mockup's visual grouping so the player-colored stripes
  // cluster at the top of each panel.
  const sorted = useMemo(() => {
    const withFlags = words.map((w) => ({ ...w, shared: sharedWords.has(w.word.toUpperCase()) }));
    return withFlags.sort((a, b) => {
      if (a.shared !== b.shared) return a.shared ? 1 : -1;
      return b.score - a.score || a.word.localeCompare(b.word);
    });
  }, [words, sharedWords]);

  const selectedBg = side === 'you' ? 'var(--compare-you-bg)' : 'var(--compare-them-bg)';
  const selectedBorder = side === 'you' ? 'var(--compare-you)' : 'var(--compare-them)';
  const uniqueStripe = side === 'you' ? 'var(--compare-you)' : 'var(--compare-them)';

  return (
    <div className="flex flex-col min-h-0 rounded-[10px] bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-2.5 py-2 shrink-0">
        <div
          className="grid w-full aspect-square gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {board.map((row, r) =>
            row.map((letter, c) => {
              const selected = animatedCells.has(`${r},${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className="rounded-[3px] flex items-center justify-center text-[9px] tabular-nums font-[family-name:var(--font-structure)] transition-[background,border-color,color] duration-150"
                  style={{
                    fontWeight: 700,
                    background: selected ? selectedBg : 'var(--surface-panel)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: selected ? selectedBorder : 'var(--ink-border-subtle)',
                    color: selected ? 'var(--ink)' : 'var(--ink-muted)',
                  }}
                >
                  {letter}
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div
        className="flex justify-between items-center px-2.5 py-1.5 text-[9px] uppercase tracking-[0.08em] bg-[var(--ink-whisper)] border-t border-b border-[var(--ink-border-subtle)] text-[color:var(--ink-soft)] leading-none font-[family-name:var(--font-structure)] shrink-0"
        style={{ fontWeight: 700 }}
      >
        <span>Words</span>
        <span
          className="text-[10px] tabular-nums text-[color:var(--ink-muted)]"
          style={{ fontWeight: 700 }}
        >
          {words.length}
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 12px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black calc(100% - 12px), transparent 100%)',
        }}
      >
        {sorted.length === 0 ? (
          <div className="px-2.5 py-4 text-[11px] italic text-[color:var(--ink-soft)] text-center font-[family-name:var(--font-display)]">
            No words found.
          </div>
        ) : (
          sorted.map((w, i) => {
            const upper = w.word.toUpperCase();
            const isSelected = highlightedWord === upper;
            return (
              <div
                key={`${w.word}-${i}`}
                onClick={() => onWordTap(upper)}
                className={[
                  'relative flex justify-between items-center py-[5px] pl-3 pr-2 text-[11px] tracking-[0.02em] cursor-pointer transition-colors duration-150 font-[family-name:var(--font-ui)] text-[color:var(--ink)]',
                  i === 0 ? '' : 'border-t border-[var(--ink-border-subtle)]',
                ].join(' ')}
                style={{
                  fontWeight: 500,
                  background: w.shared
                    ? isSelected
                      ? 'var(--compare-shared-bg-hi)'
                      : 'var(--compare-shared-bg)'
                    : isSelected
                      ? 'var(--ink-whisper)'
                      : 'transparent',
                }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-[4px] bottom-[4px] w-[3px] rounded-r-[2px]"
                  style={{
                    background: w.shared ? 'var(--compare-shared)' : uniqueStripe,
                    opacity: w.shared ? 0.5 : 1,
                  }}
                />
                {w.shared ? (
                  <span
                    className="tabular-nums italic text-[12px] tracking-[-0.01em] font-[family-name:var(--font-display)]"
                    style={{ fontWeight: 500 }}
                  >
                    {w.word}
                  </span>
                ) : (
                  <span className="tabular-nums">{w.word}</span>
                )}
                <span
                  className="text-[10px] tabular-nums text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
                  style={{ fontWeight: 700 }}
                >
                  +{w.score}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
