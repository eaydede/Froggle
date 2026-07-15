import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from 'models';
import type { ScoredWord } from '../../types';
import type { ResultsBoardConfig } from '../types';
import { findWordPath } from '../../utils/findWordPath';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { Board } from './Board';
import { ReplayScrubber } from './ReplayScrubber';
import { buildTimeline, formatClock, formatDelta, type TimelineMark } from '../timeline';

interface TimelineProps {
  board: string[][];
  foundWords: ScoredWord[];
  config: ResultsBoardConfig;
}

// The whole replay plays in this window regardless of game length, paced by
// word count and clamped, so a 6-word game isn't over in a blink and a 40-word
// game doesn't drag. Playback runs along the compressed axis, so clusters fire
// in quick succession and (shortened) breaks read as pauses.
const MIN_REPLAY_MS = 3500;
const MAX_REPLAY_MS = 9000;
const MS_PER_WORD = 550;

export function Timeline({ board, foundWords, config }: TimelineProps) {
  const model = useMemo(
    () => buildTimeline(foundWords, config.timeLimit),
    [foundWords, config.timeLimit],
  );
  const marks = model.hasData ? model.marks : [];

  const durationMs = Math.max(
    MIN_REPLAY_MS,
    Math.min(MAX_REPLAY_MS, marks.length * MS_PER_WORD),
  );
  const { playhead, playing, atEnd, toggle, seek } = useReplay(durationMs);

  // The lit word is the last one whose time the playhead has reached.
  const currentIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].xPct <= playhead * 100) idx = i;
      else break;
    }
    return idx;
  }, [marks, playhead]);

  // Prefer the path the mode supplied; solve as a fallback (daily sends found
  // words without paths, so the board can still replay them).
  const pathByWord = useMemo(() => {
    const map = new Map<string, Position[]>();
    for (const w of foundWords) {
      const upper = w.word.toUpperCase();
      map.set(upper, w.path.length ? w.path : findWordPath(board, upper) ?? []);
    }
    return map;
  }, [foundWords, board]);

  if (!model.hasData) return null;

  const current = currentIndex >= 0 ? marks[currentIndex] : null;
  const highlightPath = current ? pathByWord.get(current.word) ?? null : null;
  const highlightColor = current ? RARITY_VAR[current.rarity] : null;
  const endSeconds =
    config.timeLimit > 0 ? config.timeLimit : marks[marks.length - 1].timeSeconds;

  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <div className="shrink-0 flex justify-center">
        <Board
          board={board}
          highlightPath={highlightPath}
          highlightColor={highlightColor}
          config={config}
          compact
        />
      </div>

      <NowPlaying mark={current} />

      <ReplayScrubber
        marks={marks}
        breaks={model.breaks}
        endSeconds={endSeconds}
        playhead={playhead}
        currentIndex={currentIndex}
        onScrub={seek}
      />

      <Transport playing={playing} atEnd={atEnd} onToggle={toggle} onRestart={() => seek(0)} />

      <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex flex-col gap-1 list-none m-0 p-0">
          {marks.map((mark, i) => (
            <ReplayRow
              key={mark.word}
              mark={mark}
              active={i === currentIndex}
              onSelect={() => seek(mark.xPct / 100)}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

// Playback clock for the replay. Advances a 0–1 playhead over `durationMs`
// while playing; seeking pauses and jumps; toggling from the end restarts.
function useReplay(durationMs: number) {
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;
      setPlayhead((p) => Math.min(1, p + dt / durationMs));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [playing, durationMs]);

  useEffect(() => {
    if (playing && playhead >= 1) setPlaying(false);
  }, [playing, playhead]);

  const seek = useCallback((fraction: number) => {
    setPlaying(false);
    setPlayhead(Math.max(0, Math.min(1, fraction)));
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (playhead >= 1) setPlayhead(0);
    setPlaying(true);
  }, [playing, playhead]);

  return { playhead, playing, atEnd: playhead >= 1, toggle, seek };
}

function NowPlaying({ mark }: { mark: TimelineMark | null }) {
  if (!mark) {
    return (
      <p className="shrink-0 h-6 flex items-center justify-center text-caption text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
        Press play to replay your finds
      </p>
    );
  }
  return (
    <div className="shrink-0 h-6 flex items-center justify-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: RARITY_VAR[mark.rarity] }}
      />
      <span
        className="text-body text-[color:var(--ink)] font-[family-name:var(--font-ui)]"
        style={{ fontWeight: 600 }}
      >
        {mark.word}
      </span>
      <span className="text-caption text-[color:var(--ink-soft)] tabular-nums font-[family-name:var(--font-ui)]">
        {formatClock(mark.timeSeconds)}
      </span>
    </div>
  );
}

function Transport({
  playing,
  atEnd,
  onToggle,
  onRestart,
}: {
  playing: boolean;
  atEnd: boolean;
  onToggle: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onRestart}
        aria-label="Restart replay"
        className="flex items-center justify-center h-9 w-9 rounded-full border-0 bg-transparent text-[color:var(--ink-muted)] cursor-pointer"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
        className="flex items-center justify-center h-12 w-12 rounded-full border-0 bg-[var(--accent)] text-[color:var(--ink-inverse)] cursor-pointer"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            {/* Replay icon at the end, otherwise a play triangle. */}
            {atEnd ? (
              <path d="M12 5V2L7 7l5 5V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z" />
            ) : (
              <polygon points="7 4 20 12 7 20" />
            )}
          </svg>
        )}
      </button>
    </div>
  );
}

function ReplayRow({
  mark,
  active,
  onSelect,
}: {
  mark: TimelineMark;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <li>
      {mark.breakBefore && mark.deltaSeconds !== null && (
        <div className="flex items-center gap-2 px-1 py-0.5 text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
          <span>{formatClock(mark.deltaSeconds)} break</span>
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
        </div>
      )}
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        className="w-full flex items-center gap-2 rounded-lg py-1 pr-2 text-left border-0"
        style={{
          background: active ? 'var(--you-highlight-bg-hi)' : 'transparent',
          borderLeft: `3px solid ${RARITY_VAR[mark.rarity]}`,
          paddingLeft: 8,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span className="tabular-nums text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-ui)] w-9 shrink-0">
          {formatClock(mark.timeSeconds)}
        </span>
        <span className="flex-1 min-w-0 truncate text-body text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
          {mark.word}
        </span>
        {mark.deltaSeconds !== null && !mark.breakBefore && (
          <span className="tabular-nums text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
            {formatDelta(mark.deltaSeconds)}
          </span>
        )}
        <span className="tabular-nums text-caption text-[color:var(--ink-muted)] font-[family-name:var(--font-ui)] w-6 text-right shrink-0">
          {mark.score}
        </span>
      </button>
    </li>
  );
}
