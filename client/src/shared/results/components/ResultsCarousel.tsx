import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface CarouselPanel {
  key: string;
  /** Accessible name for the panel and its pager dot (e.g. "Results"). */
  label: string;
  node: ReactNode;
}

/**
 * Horizontal, swipeable pager for the results screen. Chrome (topbar, bottom
 * actions) stays fixed outside this component; only the panels swipe. Uses CSS
 * scroll-snap for native touch momentum, with explicit dots + arrow keys so the
 * "there's more →" affordance is discoverable and keyboard-navigable rather
 * than a hidden free-scroll.
 */
export function ResultsCarousel({ panels }: { panels: CarouselPanel[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(index, panels.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  };

  // Derive the active panel from scroll position so a swipe, an arrow key, and
  // a dot tap all converge on one source of truth.
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive((prev) => (prev === index ? prev : index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  // Keep the snapped panel pinned across viewport resizes (e.g. mobile URL bar
  // collapse), which otherwise leaves the track parked between panels.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onResize = () => {
      track.scrollLeft = active * track.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  return (
    <>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((panel) => (
          <section
            key={panel.key}
            aria-label={panel.label}
            className="w-full h-full shrink-0 snap-center flex flex-col min-h-0 overflow-hidden gap-3"
          >
            {panel.node}
          </section>
        ))}
      </div>

      <div className="shrink-0 flex items-center justify-center gap-2" role="tablist">
        {panels.map((panel, i) => {
          const isActive = i === active;
          return (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={panel.label}
              onClick={() => goTo(i)}
              className={`block h-1.5 rounded-full transition-all duration-200 border-none p-0 cursor-pointer ${
                isActive ? 'w-8 bg-[var(--accent)]' : 'w-4 bg-[var(--ink-trace)]'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          );
        })}
      </div>
    </>
  );
}
