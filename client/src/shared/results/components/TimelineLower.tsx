import { formatClock } from '../timeline';
import type { TimelineReplay } from '../useTimelineReplay';
import { ReplayScrubber } from './ReplayScrubber';
import { WordReel } from './WordReel';

/**
 * The Timeline view's lower half: the focal word reel over the scrubber and its
 * inline realtime / fast transport. The shared board + hero above are driven by
 * the same replay controller, so this panel owns no board of its own.
 */
export function TimelineLower({ replay }: { replay: TimelineReplay }) {
  const {
    model,
    marks,
    playhead,
    playing,
    mode,
    currentIndex,
    endSeconds,
    playMode,
    seek,
  } = replay;

  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <WordReel marks={marks} currentIndex={currentIndex} />
      </div>

      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <ReplayScrubber
              marks={marks}
              breaks={model.breaks}
              playhead={playhead}
              currentIndex={currentIndex}
              onScrub={seek}
            />
          </div>
          <TransportButton
            label={playing && mode === 'realtime' ? 'Pause replay' : 'Play at real speed'}
            onClick={() => playMode('realtime')}
            primary
          >
            {playing && mode === 'realtime' ? <PauseIcon /> : <PlayIcon />}
          </TransportButton>
          <TransportButton
            label={playing && mode === 'fast' ? 'Pause replay' : 'Play fast'}
            onClick={() => playMode('fast')}
          >
            {playing && mode === 'fast' ? <PauseIcon /> : <FastForwardIcon />}
          </TransportButton>
        </div>
        {/* Labels align under the track; pr clears the two trailing buttons
            (2 × w-9 + 2 × gap-2 = 88px). */}
        <div className="flex justify-between mt-1 pr-[88px] text-label-xs tabular-nums text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
          <span>0:00</span>
          <span>{formatClock(endSeconds)}</span>
        </div>
      </div>
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-full border-0 cursor-pointer ${
        primary
          ? 'bg-[var(--accent)] text-[color:var(--ink-inverse)]'
          : 'bg-transparent text-[color:var(--ink-muted)]'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <polygon points="7 4 20 12 7 20" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function FastForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <polygon points="3 4 12 12 3 20" />
      <polygon points="12 4 21 12 12 20" />
    </svg>
  );
}
