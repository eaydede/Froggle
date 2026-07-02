import { useEffect, useState } from 'react';

// The reveal shown when a Golden Ticket draw completes into one or more words.
// Each completion pops in sequence with a running total. Deliberately calm —
// no confetti or explosions — because the moment is meant to feel weighty and
// satisfying, not chaotic. Renders inline where the current-word banner
// normally sits, so it doesn't push the board around.
//
// A key on the parent side (e.g. an incrementing counter) triggers a fresh
// animation whenever a new reveal fires, so back-to-back golden draws don't
// silently overwrite the last one mid-anim.

interface GoldenRevealProps {
  words: { word: string; score: number }[];
  totalScore: number;
}

const STAGGER_MS = 90;
const HOLD_MS = 900;

export function GoldenReveal({ words, totalScore }: GoldenRevealProps) {
  // How many words are currently "shown" — grows from 0..words.length in
  // STAGGER_MS steps. Reset on each new mount (via the parent key).
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setVisibleCount(0);
    setFading(false);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    words.forEach((_, i) => {
      timeouts.push(setTimeout(() => setVisibleCount(i + 1), i * STAGGER_MS));
    });
    const totalIn = words.length * STAGGER_MS;
    timeouts.push(setTimeout(() => setFading(true), totalIn + HOLD_MS));
    return () => timeouts.forEach(clearTimeout);
  }, [words]);

  return (
    <div
      className={`flex items-center justify-center gap-1.5 tracking-wider transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        color: 'var(--golden-reveal-word)',
        fontFamily: 'var(--font-cell)',
        fontWeight: 800,
      }}
    >
      <div className="flex items-baseline gap-1.5 flex-wrap justify-center">
        {words.map((w, i) => (
          <span
            key={w.word}
            className="inline-flex items-baseline gap-[3px] transition-all duration-200 ease-out"
            style={{
              fontSize: '1.1rem',
              opacity: i < visibleCount ? 1 : 0,
              transform: i < visibleCount ? 'translateY(0)' : 'translateY(6px)',
            }}
          >
            {w.word}
            <span className="text-xs opacity-70">+{w.score}</span>
            {i < words.length - 1 && (
              <span aria-hidden className="ml-1 opacity-40">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
      <span
        className="text-xs uppercase tracking-[0.12em] tabular-nums"
        style={{
          fontWeight: 700,
          opacity: visibleCount === words.length ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      >
        · +{totalScore}
      </span>
    </div>
  );
}
