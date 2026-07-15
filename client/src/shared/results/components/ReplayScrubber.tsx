import { useRef } from 'react';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { formatClock, type TimelineBreak, type TimelineMark } from '../timeline';

interface ReplayScrubberProps {
  marks: TimelineMark[];
  breaks: TimelineBreak[];
  /** Axis end in seconds (time limit, or last find for untimed). */
  endSeconds: number;
  /** Playhead position, 0–1 along the compressed axis. */
  playhead: number;
  /** Index of the word currently lit (or -1 before the first). */
  currentIndex: number;
  /** Called with a 0–1 position when the user drags/taps the track. */
  onScrub: (fraction: number) => void;
}

/**
 * The find-density bar doubling as a replay scrubber: rarity dots on a time
 * axis, hatched break zones, and a draggable playhead. Dragging anywhere on
 * the track seeks the replay.
 */
export function ReplayScrubber({
  marks,
  breaks,
  endSeconds,
  playhead,
  currentIndex,
  onScrub,
}: ReplayScrubberProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const seekFromEvent = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = (clientX - rect.left) / rect.width;
    onScrub(Math.max(0, Math.min(1, fraction)));
  };

  // Inset so a dot centered at 0% / 100% isn't clipped by the track edge.
  const leftOf = (xPct: number) => 2 + (xPct / 100) * 96;

  return (
    <div className="shrink-0">
      <div
        ref={trackRef}
        role="slider"
        aria-label="Replay position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(playhead * 100)}
        tabIndex={0}
        className="relative h-11 rounded-xl bg-[var(--surface-card)] overflow-hidden touch-none cursor-pointer"
        style={{ boxShadow: 'inset 0 0 0 1px var(--ink-border-subtle)' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          seekFromEvent(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onScrub(Math.max(0, playhead - 0.05));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            onScrub(Math.min(1, playhead + 0.05));
          }
        }}
      >
        {breaks.map((b, i) => (
          <div
            key={`break-${i}`}
            className="absolute inset-y-0"
            title={`${formatClock(b.durationSeconds)} break`}
            style={{
              left: `${b.startPct}%`,
              width: `${Math.max(0, b.endPct - b.startPct)}%`,
              background:
                'repeating-linear-gradient(45deg, var(--ink-trace) 0 3px, transparent 3px 7px)',
            }}
          />
        ))}

        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--ink-faint)]" />

        {/* Elapsed fill up to the playhead. */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]"
          style={{ width: `${playhead * 100}%` }}
        />

        {marks.map((mark, i) => {
          const active = i === currentIndex;
          return (
            <div
              key={mark.word}
              className="absolute top-1/2 rounded-full"
              style={{
                left: `${leftOf(mark.xPct)}%`,
                width: active ? 10 : 6,
                height: active ? 10 : 6,
                transform: 'translate(-50%, -50%)',
                background: RARITY_VAR[mark.rarity],
                opacity: active ? 1 : i <= currentIndex ? 0.85 : 0.4,
                boxShadow: active ? '0 0 0 2px var(--surface-card)' : undefined,
              }}
            />
          );
        })}

        {/* Playhead. */}
        <div
          className="absolute inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"
          style={{ left: `${playhead * 100}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
        <span>0:00</span>
        <span>{formatClock(endSeconds)}</span>
      </div>
    </div>
  );
}
