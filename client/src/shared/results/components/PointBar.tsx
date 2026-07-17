interface PointBarProps {
  pointsSoFar: number;
  /** Full scale — the subject's own total (or a shared max when comparing). */
  maxPoints: number;
  /** Width (px) of the inline-word column to the right, so the bar aligns to
   *  the timeline track above/below it. */
  wordColPx: number;
  color?: string;
}

/**
 * Point progress bar sitting just above the timeline, aligned to the track. The
 * fill grows left→right as the replay scores, and the running total rides the
 * fill's leading edge — ending at the track's right edge when complete. Both the
 * fill and the number ease so points climb smoothly rather than jumping.
 */
export function PointBar({
  pointsSoFar,
  maxPoints,
  wordColPx,
  color = 'var(--accent)',
}: PointBarProps) {
  const fill = maxPoints > 0 ? Math.min(1, pointsSoFar / maxPoints) : 0;

  return (
    <div className="flex items-end gap-3">
      <div className="relative flex-1 min-w-0 h-4">
        {/* Running total, right-anchored to the fill end and kept on-track via
            max() so it never clips at the left when the fill is short. */}
        <span
          className="absolute bottom-1.5 -translate-x-full whitespace-nowrap text-caption tabular-nums font-[family-name:var(--font-structure)] leading-none [font-weight:800] transition-[left] duration-300 ease-out"
          style={{ left: `max(1.75rem, ${fill * 100}%)`, color }}
        >
          {pointsSoFar}
        </span>
        <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-[var(--ink-trace)]" />
        <div
          className="absolute left-0 bottom-0 h-1 rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${fill * 100}%`, background: color }}
        />
      </div>
      <div className="shrink-0" style={{ width: wordColPx }} aria-hidden />
    </div>
  );
}
