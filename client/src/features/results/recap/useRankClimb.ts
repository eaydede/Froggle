import { useLayoutEffect, useRef, useState } from 'react';
import type { ResultsRankRung } from 'models/results';

export function useRankClimb(points: number, rungs: ResultsRankRung[], animate: boolean, onStart: () => void) {
  const scroller = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(animate ? 0 : points);
  const [climbing, setClimbing] = useState(animate);
  const [edges, setEdges] = useState({ atTop: true, atBottom: false });
  const cancel = useRef(() => {});
  const playOnMount = useRef(animate);
  const started = useRef(onStart);
  started.current = onStart;
  const updateEdges = () => {
    const element = scroller.current;
    if (!element) return;
    const next = { atTop: element.scrollTop <= 2, atBottom: element.scrollTop >= element.scrollHeight - element.clientHeight - 2 };
    setEdges(old => old.atTop === next.atTop && old.atBottom === next.atBottom ? old : next);
  };

  useLayoutEffect(() => {
    const element = scroller.current!;
    const maximum = () => Math.max(0, element.scrollHeight - element.clientHeight);
    const position = (score: number) => {
      const index = rungs.findIndex(rung => score >= rung.points);
      return Math.max(0, Math.min(maximum(), Math.max(0, index) * 28 + 13 - element.clientHeight / 2));
    };
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    let active = playOnMount.current && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      active = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      element.scrollTop = position(points);
      setValue(points);
      setClimbing(false);
      updateEdges();
    };
    cancel.current = () => { if (active) finish(); };
    started.current();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => { if (reducedMotion.matches && active) finish(); };
    reducedMotion.addEventListener('change', onMotionChange);
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    if (!active) finish();
    else {
      setValue(0);
      setClimbing(true);
      element.scrollTop = maximum();
      updateEdges();
      timer = setTimeout(() => {
        const start = performance.now() + 200;
        const current = rungs.find(rung => points >= rung.points)!;
        const duration = 1500 + Math.min(1200, current.ordinal * 180);
        let scroll = element.scrollTop;
        const tick = (now: number) => {
          const progress = Math.max(0, Math.min(1, (now - start) / duration));
          const score = points * (1 - (1 - progress) ** 3);
          setValue(score);
          const target = position(score);
          scroll += (target - scroll) * 0.14;
          element.scrollTop = scroll;
          updateEdges();
          if (progress >= 1 && Math.abs(target - scroll) < 0.6) finish();
          else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, 350);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      cancel.current = () => {};
      observer.disconnect();
      reducedMotion.removeEventListener('change', onMotionChange);
    };
  }, [points, rungs]);

  return { scroller, value, climbing, edges, onScroll: updateEdges, cancel: () => cancel.current() };
}
