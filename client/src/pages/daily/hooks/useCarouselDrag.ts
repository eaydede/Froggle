import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCarouselDragArgs {
  trackRef: React.RefObject<HTMLDivElement>;
  cardWidth: number;
  gap: number;
  pad: number;
  currentIndex: number;
  entryCount: number;
  disabled: boolean;
  moveThreshold: number;
  swipeThreshold: number;
  onChangeIndex: (index: number) => void;
  shouldIgnoreTarget: (target: EventTarget | null) => boolean;
}

interface UseCarouselDragResult {
  positioned: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

// Encapsulates drag/swipe interaction for the carousel: global mouse and
// touch listeners, snap-to-threshold logic, the initial-paint
// "hasPositioned" flicker guard, and the transform application that moves
// the track. Exposes only the two React surface events (mouse/touch down)
// that must bind to the track JSX.
export function useCarouselDrag({
  trackRef,
  cardWidth,
  gap,
  pad,
  currentIndex,
  entryCount,
  disabled,
  moveThreshold,
  swipeThreshold,
  onChangeIndex,
  shouldIgnoreTarget,
}: UseCarouselDragArgs): UseCarouselDragResult {
  const step = cardWidth + gap;

  const getOffset = useCallback(
    (idx: number) => -(idx * step) + pad,
    [step, pad],
  );

  const applyTransform = useCallback((offset: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate
      ? 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
      : 'none';
    track.style.transform = `translateX(${offset}px)`;
  }, [trackRef]);

  const drag = useRef({ active: false, startX: 0, deltaX: 0, moved: false });
  const hasPositioned = useRef(false);
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    if (cardWidth > 0) {
      applyTransform(getOffset(currentIndex), hasPositioned.current);
      if (!hasPositioned.current) {
        hasPositioned.current = true;
        setPositioned(true);
      }
    }
  }, [currentIndex, cardWidth, getOffset, applyTransform]);

  const handleDragStart = useCallback((clientX: number) => {
    if (disabled) return;
    drag.current = { active: true, startX: clientX, deltaX: 0, moved: false };
  }, [disabled]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!drag.current.active) return;
    const delta = clientX - drag.current.startX;
    drag.current.deltaX = delta;
    if (Math.abs(delta) > moveThreshold) drag.current.moved = true;
    applyTransform(getOffset(currentIndex) + delta, false);
  }, [applyTransform, currentIndex, getOffset, moveThreshold]);

  const handleDragEnd = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;

    if (!drag.current.moved) {
      applyTransform(getOffset(currentIndex), false);
      return;
    }

    const threshold = cardWidth * swipeThreshold;
    const delta = drag.current.deltaX;

    if (delta > threshold && currentIndex > 0) {
      onChangeIndex(currentIndex - 1);
    } else if (delta < -threshold && currentIndex < entryCount - 1) {
      onChangeIndex(currentIndex + 1);
    } else {
      applyTransform(getOffset(currentIndex), true);
    }
  }, [applyTransform, cardWidth, currentIndex, entryCount, getOffset, onChangeIndex, swipeThreshold]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (shouldIgnoreTarget(e.target)) return;
    handleDragStart(e.clientX);
  }, [handleDragStart, shouldIgnoreTarget]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldIgnoreTarget(e.target)) return;
    handleDragStart(e.touches[0].clientX);
  }, [handleDragStart, shouldIgnoreTarget]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) { handleDragMove(e.clientX); }
    function onMouseUp() { handleDragEnd(); }
    function onTouchMove(e: TouchEvent) { handleDragMove(e.touches[0].clientX); }
    function onTouchEnd() { handleDragEnd(); }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return { positioned, onMouseDown, onTouchStart };
}
