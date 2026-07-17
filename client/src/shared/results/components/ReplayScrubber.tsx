import { useRef } from 'react';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import type { ReplayAttempt } from '../useTimelineReplay';
import { formatClock, type TimelineBreak, type TimelineMark } from '../timeline';

interface ReplayScrubberProps {
  marks: TimelineMark[];
  breaks: TimelineBreak[];
  /** Playhead position, 0–1 along the compressed axis. */
  playhead: number;
  /** Rejected attempts to overlay when `showAttempts` is on. */
  attempts: ReplayAttempt[];
  showAttempts: boolean;
  /** Called with a 0–1 position when the user drags/taps the track. */
  onScrub: (fraction: number) => void;
}

/**
 * The find-density bar doubling as a replay scrubber: rarity dots on a time
 * axis, hatched break zones, and a draggable playhead. Dragging anywhere on
 * the track seeks the replay. This renders only the track — the caller owns
 * the transport buttons and axis labels around it so they can align to the
 * track alone.
 */
export function ReplayScrubber({
  marks,
  breaks,
  playhead,
  attempts,
  showAttempts,
  onScrub,
}: ReplayScrubberProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Which find dots the playhead has reached, and which is the latest.
  const activeIndex = marks.reduce(
    (last, m, i) => (m.xPct <= playhead * 100 ? i : last),
    -1,
  );

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
    <div
      ref={trackRef}
      role="slider"
      aria-label="Replay position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(playhead * 100)}
      tabIndex={0}
      className="relative h-11 w-full rounded-xl bg-[var(--surface-card)] overflow-hidden touch-none cursor-pointer"
      style={{ boxShadow: 'inset 0 0 0 1px var(--ink-border-subtle)' }}
      onPointerDown={(e) => {
        // setPointerCapture can throw for stale/synthetic pointers; the seek
        // shouldn't depend on capture succeeding.
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* no-op */
        }
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

      {/* Rejected attempts ride a thin lane along the bottom, so a lull that was
          actually full of failed tries reads as activity without competing with
          the found-word dots above. */}
      {showAttempts &&
        attempts.map((attempt, i) => (
          <div
            key={`attempt-${i}`}
            className="absolute bottom-[3px] w-px h-[7px] -translate-x-1/2 bg-[var(--ink-faint)]"
            title={`${formatClock(attempt.timeSeconds)} · ${
              attempt.reason === 'repeat' ? 'repeat' : 'not a word'
            }${attempt.word ? ` (${attempt.word})` : ''}`}
            style={{ left: `${leftOf(attempt.xPct)}%` }}
          />
        ))}

      {/* Elapsed fill up to the playhead. */}
      <div
        className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]"
        style={{ width: `${playhead * 100}%` }}
      />

      {marks.map((mark, i) => {
        const active = i === activeIndex;
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
              opacity: active ? 1 : i <= activeIndex ? 0.85 : 0.4,
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
  );
}
