interface PointBarProps {
  pointsSoFar: number;
  /** Full scale — the subject's own total (or a shared max when comparing).
   *  Only sets where the bar lands at the end; there's no visible track. */
  maxPoints: number;
  /** Width (px) of the inline-word column to the right, so the bar aligns to
   *  the timeline track above/below it. */
  wordColPx: number;
  color?: string;
}

/**
 * Point progress bar above the timeline: a bare accent segment that grows with
 * the score (no track, so it reads as points ticking up rather than filling a
 * container), with the running total inline just to its right, riding the end as
 * it grows. Both ease so points climb smoothly.
 */
export function PointBar({
  pointsSoFar,
  maxPoints,
  wordColPx,
  color = 'var(--accent)',
}: PointBarProps) {
  const fill = maxPoints > 0 ? Math.min(1, pointsSoFar / maxPoints) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 min-w-0 h-4 flex items-center">
        <div
          className="h-1 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${fill * 100}%`, background: color }}
        />
        <span
          className="absolute ml-1.5 whitespace-nowrap text-caption tabular-nums font-[family-name:var(--font-structure)] leading-none [font-weight:800] transition-[left] duration-300 ease-out"
          style={{ left: `${fill * 100}%`, color }}
        >
          {pointsSoFar}
        </span>
      </div>
      <div className="shrink-0" style={{ width: wordColPx }} aria-hidden />
    </div>
  );
}
