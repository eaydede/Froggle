import { useEffect, useRef } from "react";

/**
 * Highlight patterns for each board size.
 * Diagonal from top-left to bottom-right.
 */
const HIGHLIGHTS: Record<number, { hi: number[]; hi2: number[] }> = {
  4: { hi: [0, 5, 10, 15], hi2: [] },
  5: { hi: [0, 6, 12, 18, 24], hi2: [] },
  6: { hi: [0, 7, 14, 21, 28, 35], hi2: [] },
};

interface MiniGridProps {
  size: number;
  selected: boolean;
  /** Incremented to re-trigger the pop animation on selection */
  animationKey: number;
}

export function MiniGrid({ size, selected, animationKey }: MiniGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const total = size * size;
  const { hi, hi2 } = HIGHLIGHTS[size] ?? { hi: [], hi2: [] };

  // Re-trigger CSS animations by removing and re-adding the class
  useEffect(() => {
    if (!selected || !gridRef.current) return;

    const cells = gridRef.current.querySelectorAll<HTMLElement>(".cell");
    cells.forEach((cell) => {
      cell.classList.remove("cell-animate");
      // Force reflow so the browser registers the removal
      void cell.offsetHeight;
      cell.classList.add("cell-animate");
    });
  }, [animationKey, selected]);

  return (
    <div
      ref={gridRef}
      className="inline-grid"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gap: 2.5,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isHi = hi.includes(i);
        const isHi2 = hi2.includes(i);

        let colorClass = "bg-[var(--dot)]";
        if (selected) {
          if (isHi) colorClass = "bg-[var(--dot-hi)]";
          else if (isHi2) colorClass = "bg-[var(--dot-hi2)]";
          // Non-highlighted cells stay at --dot when selected
        }

        return (
          <div
            key={i}
            className={`cell size-1.5 rounded-[1.5px] transition-all duration-350 ${colorClass}`}
            style={{ animationDelay: `${i * 0.015}s` }}
          />
        );
      })}
    </div>
  );
}
