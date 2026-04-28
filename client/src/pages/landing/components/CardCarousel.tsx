import { useEffect, useRef, useState, type ReactNode } from 'react';

interface CardCarouselProps {
  children: ReactNode[];
  /** Index to scroll to on mount. Defaults to 0 (first card). */
  defaultIndex?: number;
}

/** Horizontal scroll-snap carousel with indicator dots. Uses native CSS
 *  scroll-snap so swipe / trackpad gestures work without a gesture library.
 *  Each child renders at full container width and snaps into view. */
export function CardCarousel({ children, defaultIndex = 0 }: CardCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  // Snap to the default slide on mount. We can't rely on initial render
  // alone because layout-driven scroll positions are reset to 0 by the
  // browser; a useEffect with `behavior: 'instant'` lands the user where
  // they expect without an animation flash.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * defaultIndex, behavior: 'instant' as ScrollBehavior });
  }, [defaultIndex]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activeIndex) setActiveIndex(i);
  };

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none] -my-6 py-6"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="snap-center shrink-0 basis-full px-2 box-border"
            style={{ scrollSnapAlign: 'center' }}
          >
            {child}
          </div>
        ))}
      </div>
      {children.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => goTo(i)}
              className={
                'h-1.5 rounded-full transition-all duration-200 cursor-pointer border-none ' +
                (i === activeIndex
                  ? 'w-4 bg-[var(--ink-muted)]'
                  : 'w-1.5 bg-[var(--ink-border)] hover:bg-[var(--ink-soft)]')
              }
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
