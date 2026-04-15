import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { DailyEntry } from "../types";
import { CompletedCard } from "./CompletedCard";
import { UnplayedCard } from "./UnplayedCard";
import { MissedCard } from "./MissedCard";
import { CardActions } from "./CardActions";

interface CardCarouselProps {
  entries: DailyEntry[];
  currentIndex: number;
  defExpanded: boolean;
  onChangeIndex: (index: number) => void;
  onStartPuzzle: () => void;
  onViewResults: (puzzleNumber: number) => void;
  onViewLeaderboard: (puzzleNumber: number) => void;
  onShare: (puzzleNumber: number) => void;
  onDefinitionExpand: (expanded: boolean) => void;
  /** When true, swipe gestures are ignored (e.g. picker is open) */
  disabled?: boolean;
}

/**
 * Horizontal padding on each side of the carousel.
 * Cards are sized as (containerWidth - PAD * 2), so adjacent cards
 * peek by PAD pixels on each side.
 */
const PAD = 18;

/** Gap between card slots in px */
const GAP = 6;

/** Minimum drag distance (px) before it counts as a move rather than a tap */
const MOVE_THRESHOLD = 5;

/** Fraction of card width you need to drag before it snaps to the next card */
const SWIPE_THRESHOLD = 0.15;

export function CardCarousel({
  entries,
  currentIndex,
  defExpanded,
  onChangeIndex,
  onStartPuzzle,
  onViewResults,
  onViewLeaderboard,
  onShare,
  onDefinitionExpand,
  disabled = false,
}: CardCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(0);

  // Drag state lives in a ref so event handlers always see current values
  // without causing re-renders on every pointermove.
  const drag = useRef({
    active: false,
    startX: 0,
    deltaX: 0,
    moved: false,
  });

  const step = cardWidth + GAP;

  /** Pixel offset for the track transform at the current index */
  const getOffset = useCallback(
    (idx: number) => -(idx * step) + PAD,
    [step],
  );

  // ── Measurement ──────────────────────────────────────────────
  const measure = useCallback(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track) return;

    const containerW = carousel.offsetWidth;
    const cW = containerW - PAD * 2;
    setCardWidth(cW);

    // Size each slot and find the tallest
    const slots = track.querySelectorAll<HTMLElement>("[data-card-slot]");
    slots.forEach((s) => {
      s.style.width = `${cW}px`;
      s.style.height = "auto";
    });

    let maxH = 0;
    slots.forEach((s) => {
      if (s.scrollHeight > maxH) maxH = s.scrollHeight;
    });

    setCarouselHeight(maxH);
    slots.forEach((s) => {
      s.style.height = `${maxH}px`;
    });
  }, []);

  useEffect(() => {
    // Measure after first paint so slots have their content
    requestAnimationFrame(measure);

    // Use ResizeObserver on the carousel container so we re-measure
    // whenever it changes size (e.g. parent layout shift, panel resize),
    // not only on window resize.
    const el = carouselRef.current;
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, entries.length]);

  // ── Track transform helpers ──────────────────────────────────
  function applyTransform(offset: number, animate: boolean) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate
      ? "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)"
      : "none";
    track.style.transform = `translateX(${offset}px)`;
  }

  // Animate to the current index whenever it changes
  useEffect(() => {
    if (cardWidth > 0) {
      applyTransform(getOffset(currentIndex), true);
    }
  }, [currentIndex, cardWidth, getOffset]);

  // ── Drag / swipe handling ────────────────────────────────────
  function shouldIgnoreTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    return !!(
      target.closest("[data-chevron-btn]") ||
      target.closest("[data-start-btn]")
    );
  }

  function handleDragStart(clientX: number) {
    if (disabled || defExpanded) return;
    drag.current = { active: true, startX: clientX, deltaX: 0, moved: false };
  }

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!drag.current.active) return;
      const delta = clientX - drag.current.startX;
      drag.current.deltaX = delta;
      if (Math.abs(delta) > MOVE_THRESHOLD) drag.current.moved = true;
      applyTransform(getOffset(currentIndex) + delta, false);
    },
    [currentIndex, getOffset],
  );

  const handleDragEnd = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;

    if (!drag.current.moved) {
      // It was a tap, not a swipe — snap back without animation flicker
      applyTransform(getOffset(currentIndex), false);
      return;
    }

    const threshold = cardWidth * SWIPE_THRESHOLD;
    const delta = drag.current.deltaX;

    if (delta > threshold && currentIndex > 0) {
      onChangeIndex(currentIndex - 1);
    } else if (delta < -threshold && currentIndex < entries.length - 1) {
      onChangeIndex(currentIndex + 1);
    } else {
      applyTransform(getOffset(currentIndex), true);
    }
  }, [cardWidth, currentIndex, entries.length, getOffset, onChangeIndex]);

  // Mouse events on the track element
  function onMouseDown(e: React.MouseEvent) {
    if (shouldIgnoreTarget(e.target)) return;
    handleDragStart(e.clientX);
  }

  // Touch events on the track element
  function onTouchStart(e: React.TouchEvent) {
    if (shouldIgnoreTarget(e.target)) return;
    handleDragStart(e.touches[0].clientX);
  }

  // Global move/end listeners so dragging works even if pointer leaves the track
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      handleDragMove(e.clientX);
    }
    function onMouseUp() {
      handleDragEnd();
    }
    function onTouchMove(e: TouchEvent) {
      handleDragMove(e.touches[0].clientX);
    }
    function onTouchEnd() {
      handleDragEnd();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // ── Render ───────────────────────────────────────────────────
  const currentEntry = entries[currentIndex];

  return (
    <>
      <div
        ref={carouselRef}
        className={`relative ${defExpanded ? "z-12" : "z-1"}`}
        style={{
          height: carouselHeight > 0 ? carouselHeight : "auto",
          overflowX: "clip",
          overflowY: defExpanded ? "visible" : "hidden",
        }}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform select-none"
          style={{ gap: `${GAP}px` }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {entries.map((entry, index) => {
            let card: ReactNode;

            if (entry.state === "unplayed") {
              card = (
                <UnplayedCard
                  config={entry.config}
                  onStart={onStartPuzzle}
                />
              );
            } else if (entry.state === "missed") {
              card = (
                <MissedCard
                  puzzleNumber={entry.puzzleNumber}
                  playersCount={entry.playersCount}
                />
              );
            } else {
              card = (
                <CompletedCard
                  entry={entry}
                  expanded={defExpanded && index === currentIndex}
                  onExpandChange={onDefinitionExpand}
                />
              );
            }

            return (
              <div
                key={entry.puzzleNumber}
                data-card-slot
                className="shrink-0 flex flex-col"
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card actions — rendered outside the carousel so they stay fixed in
          place (and get covered by the blur overlay) when the current card's
          definition is expanded. */}
      {currentEntry && (
        <div className="mx-[18px] mt-2 mb-3.5">
          <CardActions
            isCompleted={currentEntry.state === "completed"}
            onResults={() => onViewResults(currentEntry.puzzleNumber)}
            onLeaderboard={() => onViewLeaderboard(currentEntry.puzzleNumber)}
            onShare={() => onShare(currentEntry.puzzleNumber)}
          />
        </div>
      )}
    </>
  );
}