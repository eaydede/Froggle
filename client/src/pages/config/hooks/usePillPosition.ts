import { useRef, useState, useCallback, useLayoutEffect } from "react";

/**
 * Calculates the pill's `left` position based on the selected index
 * and the track's measured width. Returns a ref for the track element
 * and the computed left value in pixels.
 */
export function usePillPosition(selectedIndex: number, segmentCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pillLeft, setPillLeft] = useState(3);

  const recalc = useCallback(() => {
    if (!trackRef.current) return;
    const trackWidth = trackRef.current.offsetWidth;
    const padding = 3;
    const segWidth = (trackWidth - padding * 2) / segmentCount;
    setPillLeft(padding + selectedIndex * segWidth);
  }, [selectedIndex, segmentCount]);

  useLayoutEffect(() => {
    recalc();

    // Recalculate on resize so the pill doesn't drift
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

  return { trackRef, pillLeft };
}
