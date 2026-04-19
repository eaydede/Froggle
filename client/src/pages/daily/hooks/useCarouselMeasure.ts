import { useCallback, useEffect, useState } from 'react';

interface UseCarouselMeasureArgs {
  carouselRef: React.RefObject<HTMLDivElement>;
  trackRef: React.RefObject<HTMLDivElement>;
  pad: number;
  entryCount: number;
}

interface UseCarouselMeasureResult {
  cardWidth: number;
  carouselHeight: number;
}

// Measures the carousel container and resizes every card slot so that they
// share a width (containerWidth - pad * 2) and match the tallest slot's
// height. Re-measures on container resize so layout shifts in the parent
// propagate. `entryCount` is a dependency because the slot DOM changes when
// entries are added/removed.
export function useCarouselMeasure({
  carouselRef,
  trackRef,
  pad,
  entryCount,
}: UseCarouselMeasureArgs): UseCarouselMeasureResult {
  const [cardWidth, setCardWidth] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(0);

  const measure = useCallback(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track) return;

    const containerW = carousel.offsetWidth;
    const cW = containerW - pad * 2;
    setCardWidth(cW);

    const slots = track.querySelectorAll<HTMLElement>('[data-card-slot]');
    slots.forEach((s) => {
      s.style.width = `${cW}px`;
      s.style.height = 'auto';
    });

    let maxH = 0;
    slots.forEach((s) => {
      if (s.scrollHeight > maxH) maxH = s.scrollHeight;
    });

    setCarouselHeight(maxH);
    slots.forEach((s) => {
      s.style.height = `${maxH}px`;
    });
  }, [carouselRef, trackRef, pad]);

  useEffect(() => {
    requestAnimationFrame(measure);

    const el = carouselRef.current;
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, entryCount, carouselRef]);

  return { cardWidth, carouselHeight };
}
