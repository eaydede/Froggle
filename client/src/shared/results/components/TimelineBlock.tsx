import { useLayoutEffect, useRef, useState } from 'react';
import { formatClock, type TimelineBreak, type TimelineMark } from '../timeline';
import type { ReplayAttempt, TimelineEvent } from '../useTimelineReplay';
import { InlineWord } from './InlineWord';
import { PointBar } from './PointBar';
import { ReplayScrubber } from './ReplayScrubber';

interface TimelineBlockProps {
  marks: TimelineMark[];
  breaks: TimelineBreak[];
  attempts: ReplayAttempt[];
  showMisses: boolean;
  playhead: number;
  onScrub: (fraction: number) => void;
  pointsSoFar: number;
  maxPoints: number;
  current: TimelineEvent | null;
  currentTimeSeconds: number;
  endSeconds: number;
  /** Width (px) of the inline-word column — sized once to the game's longest
   *  word so it fits without truncating and the scrubber never jitters. */
  wordColPx: number;
  color?: string;
}

/**
 * One player's timeline: the point bar over a row of [scrubber | current word],
 * with the axis time labels + moving readout beneath the scrubber. Playback
 * lives in the shared interaction bar below, so two of these can stack and scrub
 * together in compare mode.
 */
export function TimelineBlock({
  marks,
  breaks,
  attempts,
  showMisses,
  playhead,
  onScrub,
  pointsSoFar,
  maxPoints,
  current,
  currentTimeSeconds,
  endSeconds,
  wordColPx,
  color,
}: TimelineBlockProps) {
  // Measure the track width to hide a fixed range label when the moving readout
  // overlaps it, and to keep the readout from clipping at the ends.
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const [labelsWidth, setLabelsWidth] = useState(0);
  useLayoutEffect(() => {
    const el = labelsRef.current;
    if (!el) return;
    const measure = () => setLabelsWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const OVERLAP_PX = 42;
  const READOUT_HALF_PX = 18;
  const readoutPx = playhead * labelsWidth;
  const hideStart = labelsWidth > 0 && readoutPx < OVERLAP_PX;
  const hideEnd = labelsWidth > 0 && readoutPx > labelsWidth - OVERLAP_PX;
  const readoutLeftPx =
    labelsWidth > 0
      ? Math.max(READOUT_HALF_PX, Math.min(readoutPx, labelsWidth - READOUT_HALF_PX))
      : null;

  return (
    <div className="flex flex-col gap-1">
      <PointBar
        pointsSoFar={pointsSoFar}
        maxPoints={maxPoints}
        wordColPx={wordColPx}
        color={color}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <ReplayScrubber
            marks={marks}
            breaks={breaks}
            attempts={attempts}
            showAttempts={showMisses}
            playhead={playhead}
            onScrub={onScrub}
          />
        </div>
        <div className="shrink-0" style={{ width: wordColPx }}>
          <InlineWord current={current} />
        </div>
      </div>

      {/* Axis labels + moving current-time readout, aligned to the scrubber. */}
      <div className="flex items-start gap-3">
        <div
          ref={labelsRef}
          className="relative flex-1 min-w-0 h-3.5 text-label-xs tabular-nums font-[family-name:var(--font-ui)]"
        >
          <span
            className="absolute left-0 top-0 text-[color:var(--ink-faint)] transition-opacity duration-150"
            style={{ opacity: hideStart ? 0 : 1 }}
          >
            0:00
          </span>
          <span
            className="absolute right-0 top-0 text-[color:var(--ink-faint)] transition-opacity duration-150"
            style={{ opacity: hideEnd ? 0 : 1 }}
          >
            {formatClock(endSeconds)}
          </span>
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[color:var(--accent)] [font-weight:700]"
            style={{ left: readoutLeftPx != null ? `${readoutLeftPx}px` : `${playhead * 100}%` }}
          >
            {formatClock(currentTimeSeconds)}
          </span>
        </div>
        <div className="shrink-0" style={{ width: wordColPx }} aria-hidden />
      </div>
    </div>
  );
}
