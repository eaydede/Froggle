import { useRef, useEffect, useCallback } from 'react';

export const useSwipe = (onDecrease: () => void, onIncrease: () => void) => {
  const dragStartX = useRef<number>(0);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const swipeDistance = e.changedTouches[0].clientX - dragStartX.current;
    const minSwipeDistance = 20;

    if (swipeDistance > minSwipeDistance) {
      onDecrease();
    } else if (swipeDistance < -minSwipeDistance) {
      onIncrease();
    }
  }, [onDecrease, onIncrease]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const swipeDistance = e.clientX - dragStartX.current;
    const minSwipeDistance = 20;

    if (swipeDistance > minSwipeDistance) {
      onDecrease();
    } else if (swipeDistance < -minSwipeDistance) {
      onIncrease();
    }
  };

  return { elementRef, handleMouseDown, handleMouseUp };
};
