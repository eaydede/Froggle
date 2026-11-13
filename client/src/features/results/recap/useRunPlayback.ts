import { useEffect, useRef, useState } from 'react';
export function useRunPlayback(duration: number) {
  const [time, setTime] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const frame = useRef(0);
  const stop = () => {
    cancelAnimationFrame(frame.current);
    setPlaying(false);
  };
  useEffect(() => {
    setTime(duration);
    setPlaying(false);
  }, [duration]);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - (time / duration) * 7000;
    const tick = (now: number) => {
      const next = Math.min(duration, ((now - start) / 7000) * duration);
      setTime(next);
      if (next >= duration) setPlaying(false);
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // The playhead changes every frame; capture only the starting time.
  }, [playing, duration]);
  return {
    time,
    playing,
    scrubbing,
    reset: () => {
      stop();
      setScrubbing(false);
      setTime(duration);
    },
    toggle: () => {
      if (playing) stop();
      else {
        if (time >= duration) setTime(0);
        setPlaying(true);
      }
    },
    seek: (next: number) => {
      stop();
      setTime(next);
    },
    setScrubbing,
  };
}
