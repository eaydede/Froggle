import type { TimelineBreak, TimelineMark } from '../timeline';
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
  /** Width (px) of the inline-word column — sized once to the game's longest
   *  word so it fits without truncating and the scrubber never jitters. */
  wordColPx: number;
  color?: string;
}

/**
 * One player's timeline: the point bar over a row of [scrubber | current word].
 * Playback (play/pause/speed) lives in the shared interaction bar below, so this
 * block is purely the track + its readouts — which lets two of them stack and
 * scrub together in compare mode.
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
  wordColPx,
  color,
}: TimelineBlockProps) {
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
    </div>
  );
}
