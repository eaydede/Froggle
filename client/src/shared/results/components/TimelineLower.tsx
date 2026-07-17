import { useLayoutEffect, useRef, useState } from 'react';
import { formatClock } from '../timeline';
import type { TimelineReplay } from '../useTimelineReplay';
import { ReplayScrubber } from './ReplayScrubber';
import { WordReel } from './WordReel';

/**
 * The Timeline view's lower half: the focal word reel over the scrubber and its
 * inline realtime / fast transport. The shared board + hero above are driven by
 * the same replay controller, so this panel owns no board of its own.
 */
export function TimelineLower({
  replay,
  subjectName,
  showMisses,
  onToggleMisses,
}: {
  replay: TimelineReplay;
  /** Whose replay this is — "You" or an opponent's name. */
  subjectName: string;
  showMisses: boolean;
  onToggleMisses: () => void;
}) {
  const {
    model,
    hasData,
    playhead,
    playing,
    mode,
    events,
    currentIndex,
    attempts,
    endSeconds,
    currentTimeSeconds,
    playMode,
    seek,
  } = replay;

  const isOpponent = subjectName !== 'You';

  // Hide a fixed range label while the moving readout overlaps it, restoring it
  // once the readout has cleared. Needs the track's pixel width to know when the
  // readout (centred on the playhead) collides with a label pinned to an edge.
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
  // ~half the readout width + a fixed label's width; overlap when the readout's
  // near edge crosses into the label's zone.
  const OVERLAP_PX = 42;
  const readoutPx = playhead * labelsWidth;
  const hideStart = labelsWidth > 0 && readoutPx < OVERLAP_PX;
  const hideEnd = labelsWidth > 0 && readoutPx > labelsWidth - OVERLAP_PX;

  if (!hasData) {
    return (
      <div className="flex flex-col min-h-0 h-full items-center justify-center text-center px-6">
        <p className="text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-display)] italic leading-[1.4]">
          No find times recorded for {isOpponent ? subjectName : 'this game'}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <div className="shrink-0 flex items-center justify-between gap-2 min-h-[22px]">
        <span className="uppercase text-label-xs tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] [font-weight:700] truncate">
          {isOpponent ? `${subjectName}'s replay` : ''}
        </span>
        {attempts.length > 0 && (
          <button
            type="button"
            onClick={onToggleMisses}
            aria-pressed={showMisses}
            className={`shrink-0 flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-label-xs uppercase tracking-[0.06em] font-[family-name:var(--font-structure)] border cursor-pointer transition-colors ${
              showMisses
                ? 'bg-[var(--color-invalid)] border-transparent text-[color:var(--ink-inverse)]'
                : 'bg-transparent border-[var(--ink-border-subtle)] text-[color:var(--ink-muted)]'
            }`}
            style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                background: showMisses ? 'var(--ink-inverse)' : 'var(--color-invalid)',
              }}
            />
            {showMisses ? 'Hide' : 'Show'} misses · {attempts.length}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <WordReel events={events} currentIndex={currentIndex} />
      </div>

      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <ReplayScrubber
              marks={model.marks}
              breaks={model.breaks}
              playhead={playhead}
              attempts={attempts}
              showAttempts={showMisses}
              onScrub={seek}
            />
          </div>
          <TransportButton
            label={playing && mode === 'realtime' ? 'Pause replay' : 'Play at real speed'}
            onClick={() => playMode('realtime')}
            primary={playing && mode === 'realtime'}
          >
            {playing && mode === 'realtime' ? <PauseIcon /> : <PlayIcon />}
          </TransportButton>
          <TransportButton
            label={playing && mode === 'fast' ? 'Pause replay' : 'Play fast'}
            onClick={() => playMode('fast')}
            primary={playing && mode === 'fast'}
          >
            {playing && mode === 'fast' ? <PauseIcon /> : <FastForwardIcon />}
          </TransportButton>
        </div>
        {/* Axis labels + a live current-time readout under the playhead. The
            row mirrors the scrubber row's flex (flex-1 track + two w-9 buttons)
            so the flex-1 here is exactly the track width and the readout can be
            positioned by playhead fraction to sit under the playhead line. */}
        <div className="flex items-start gap-2 mt-1">
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
              className="absolute top-0 -translate-x-1/2 text-[color:var(--accent)] [font-weight:700]"
              style={{ left: `${playhead * 100}%` }}
            >
              {formatClock(currentTimeSeconds)}
            </span>
          </div>
          <div className="w-9 shrink-0" aria-hidden />
          <div className="w-9 shrink-0" aria-hidden />
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
