import { useRef, type ReactNode } from 'react';
import type { DailyEntry } from '../types';
import { CompletedCard } from './CompletedCard';
import { UnplayedCard } from './UnplayedCard';
import { MissedCard } from './MissedCard';
import { CardActions } from './CardActions';
import { useCarouselMeasure } from '../hooks/useCarouselMeasure';
import { useCarouselDrag } from '../hooks/useCarouselDrag';

interface CardCarouselProps {
  entries: DailyEntry[];
  currentIndex: number;
  defExpanded: boolean;
  onChangeIndex: (index: number) => void;
  onStartPuzzle: () => void;
  onViewResults: (puzzleNumber: number) => void;
  onViewLeaderboard: (puzzleNumber: number) => void;
  getShareText: (puzzleNumber: number) => Promise<string>;
  onDefinitionExpand: (expanded: boolean) => void;
  /** When true, swipe gestures are ignored (e.g. picker is open). */
  disabled?: boolean;
}

// Horizontal padding on each side of the carousel; cards are sized as
// (containerWidth - PAD * 2), so adjacent cards peek by PAD on each side.
const PAD = 18;
const GAP = 6;
// Minimum drag distance before it counts as a swipe rather than a tap.
const MOVE_THRESHOLD = 5;
// Fraction of card width a drag must exceed to snap to the next card.
const SWIPE_THRESHOLD = 0.15;

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return !!(
    target.closest('[data-chevron-btn]') ||
    target.closest('[data-start-btn]')
  );
}

export function CardCarousel({
  entries,
  currentIndex,
  defExpanded,
  onChangeIndex,
  onStartPuzzle,
  onViewResults,
  onViewLeaderboard,
  getShareText,
  onDefinitionExpand,
  disabled = false,
}: CardCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const { cardWidth, carouselHeight } = useCarouselMeasure({
    carouselRef,
    trackRef,
    pad: PAD,
    entryCount: entries.length,
  });

  const { positioned, onMouseDown, onTouchStart } = useCarouselDrag({
    trackRef,
    cardWidth,
    gap: GAP,
    pad: PAD,
    currentIndex,
    entryCount: entries.length,
    disabled: disabled || defExpanded,
    moveThreshold: MOVE_THRESHOLD,
    swipeThreshold: SWIPE_THRESHOLD,
    onChangeIndex,
    shouldIgnoreTarget,
  });

  const currentEntry = entries[currentIndex];

  return (
    <>
      <div
        ref={carouselRef}
        className={`relative ${defExpanded ? 'z-12' : 'z-1'}`}
        style={{
          height: carouselHeight > 0 ? carouselHeight : 'auto',
          overflowX: 'clip',
          overflowY: defExpanded ? 'visible' : 'hidden',
          marginInline: -20,
        }}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform select-none"
          style={{ gap: `${GAP}px`, visibility: positioned ? 'visible' : 'hidden' }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {entries.map((entry, index) => {
            let card: ReactNode;

            if (entry.state === 'unplayed') {
              card = <UnplayedCard config={entry.config} onStart={onStartPuzzle} />;
            } else if (entry.state === 'missed') {
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

      {/* Rendered outside the carousel so these actions stay fixed in place
          (and get covered by the blur overlay) when the current card's
          definition is expanded. */}
      {currentEntry && (
        <div className="mt-2 mb-3.5">
          <CardActions
            isCompleted={currentEntry.state === 'completed'}
            onResults={() => onViewResults(currentEntry.puzzleNumber)}
            onLeaderboard={() => onViewLeaderboard(currentEntry.puzzleNumber)}
            getShareText={() => getShareText(currentEntry.puzzleNumber)}
          />
        </div>
      )}
    </>
  );
}
