import { useEffect, useRef, useState } from 'react';
import type { Game } from 'models';

// Time is Money's clock. The base track depletes like a normal timer, but
// found words push the remaining time past full — each extra `baseSeconds`
// worth of banked time stacks as another coloured layer on top (blue → purple
// → orange, mapping to the word-rarity palette), so the player sees their
// buffer grow with every word. Layers deplete top-down: the orange overflow
// drains before purple, purple before blue, blue before the base track.
//
// Anchored to the server-issued game.startedAt the same way TimerBar/useTimer
// are, so a mid-play refresh resumes the bar instead of snapping to full.

interface OverflowTimerBarProps {
  game: Game;
  baseSeconds: number;
}

const OVERFLOW_COLORS = [
  'var(--rarity-epic)',
  'var(--rarity-mythic)',
  'var(--rarity-legendary)',
];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function OverflowTimerBar({ game, baseSeconds }: OverflowTimerBarProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(baseSeconds);
  const localStartRef = useRef<number | null>(null);
  const anchoredStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (localStartRef.current === null || anchoredStartedAtRef.current !== game.startedAt) {
      const serverElapsedMs = Math.max(0, Date.now() - game.startedAt);
      localStartRef.current = performance.now() - serverElapsedMs;
      anchoredStartedAtRef.current = game.startedAt;
    }
    const localStart = localStartRef.current;

    const tick = () => {
      const elapsed = performance.now() - localStart;
      const totalMs = game.config.durationSeconds * 1000;
      setRemainingSeconds(Math.max(0, (totalMs - elapsed) / 1000));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [game.config.durationSeconds, game.startedAt]);

  const base = Math.max(1, baseSeconds);
  const baseWidth = clamp01(remainingSeconds / base) * 100;
  const overflowWidths = OVERFLOW_COLORS.map((_, i) =>
    clamp01((remainingSeconds - base * (i + 1)) / base) * 100,
  );

  return (
    <div className="relative h-2 bg-[#e0e0e0] rounded overflow-hidden w-full min-w-[100px]">
      <div
        className="absolute inset-y-0 left-0 rounded bg-[var(--accent)] transition-[width] duration-100 ease-linear"
        style={{ width: `${baseWidth}%` }}
      />
      {OVERFLOW_COLORS.map((color, i) => (
        <div
          key={color}
          className="absolute inset-y-0 left-0 rounded transition-[width] duration-100 ease-linear"
          style={{ width: `${overflowWidths[i]}%`, background: color }}
        />
      ))}
    </div>
  );
}
