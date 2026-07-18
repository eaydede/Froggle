import type { TimelineReplay } from '../useTimelineReplay';
import { TimelineBlock } from './TimelineBlock';

/**
 * The Timeline view's lower half: the subject's timeline block (point bar +
 * scrubber + inline current word) over a shared interaction bar (play / fast /
 * show-misses). The board + hero above are driven by the same replay controller.
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
    current,
    attempts,
    pointsSoFar,
    totalPoints,
    currentTimeSeconds,
    endSeconds,
    playMode,
    seek,
  } = replay;

  const isOpponent = subjectName !== 'You';

  // Size the word column once to the game's longest word (finds + all attempts,
  // regardless of the misses toggle) so it never truncates or jitters.
  const maxWordLen = Math.max(
    4,
    ...model.marks.map((m) => m.word.length),
    ...attempts.map((a) => a.word.length),
  );
  const wordColPx = Math.min(180, 36 + maxWordLen * 13);

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
    <div className="flex flex-col min-h-0 h-full justify-center gap-6 px-1">
      {isOpponent && (
        <div className="shrink-0 text-center uppercase text-label-xs tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] [font-weight:700] truncate">
          {subjectName}'s replay
        </div>
      )}

      <TimelineBlock
        marks={model.marks}
        breaks={model.breaks}
        attempts={attempts}
        showMisses={showMisses}
        playhead={playhead}
        onScrub={seek}
        pointsSoFar={pointsSoFar}
        maxPoints={totalPoints}
        current={current}
        currentTimeSeconds={currentTimeSeconds}
        endSeconds={endSeconds}
        wordColPx={wordColPx}
      />

      {/* Interaction bar below the timeline. */}
      <div className="shrink-0 flex items-center justify-center gap-3">
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

        {attempts.length > 0 && (
          <>
            <span className="w-px h-6 bg-[var(--ink-border-subtle)]" aria-hidden />
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
                style={{ background: showMisses ? 'var(--ink-inverse)' : 'var(--color-invalid)' }}
              />
              {showMisses ? 'Hide' : 'Show'} misses · {attempts.length}
            </button>
          </>
        )}
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
