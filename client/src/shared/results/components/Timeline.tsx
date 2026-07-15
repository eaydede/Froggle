import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from 'models';
import type { ScoredWord } from '../../types';
import type { ResultsBoardConfig } from '../types';
import { findWordPath } from '../../utils/findWordPath';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { Board } from './Board';
import { ResultsHero } from './ResultsHero';
import { ReplayScrubber } from './ReplayScrubber';
import { ReplayWordList } from './ReplayWordList';
import { buildTimeline, formatClock } from '../timeline';

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

// Faster than the board's default tap cadence so a word's whole path lights
// before the playhead reaches the next find, even in a tight cluster.
const REPLAY_STEP_MS = 32;

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

  // Score + word count accumulated up to the playhead, so the hero climbs as
  // the replay progresses and lands on the game's real total at the end.
  const pointsSoFar = marks
    .slice(0, currentIndex + 1)
    .reduce((sum, m) => sum + m.score, 0);
  const wordsSoFar = currentIndex + 1;

  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <ResultsHero
        me={{ displayName: 'You', points: pointsSoFar, wordCount: wordsSoFar }}
        myRank={1}
        totalPlayers={1}
        opponent={null}
        oppRank={null}
        compact
      />

      <div className="shrink-0 flex justify-center">
        <Board
          board={board}
          highlightPath={highlightPath}
          highlightColor={highlightColor}
          config={config}
          compact
          stepMs={REPLAY_STEP_MS}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <ReplayWordList
          marks={marks}
          currentIndex={currentIndex}
          onSelect={(i) => seek(marks[i].xPct / 100)}
        />
      </div>

      {/* Scrubber sits directly above the transport, below the list — the
          primary point of interaction lands within easy thumb reach. */}
      <div className="shrink-0">
        <ReplayScrubber
          marks={marks}
          breaks={model.breaks}
          playhead={playhead}
          currentIndex={currentIndex}
          onScrub={seek}
        />
        <div className="flex justify-between mt-1 text-label-xs tabular-nums text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
          <span>0:00</span>
          <span>{formatClock(endSeconds)}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-center gap-5">
        <TransportButton label="Restart replay" onClick={() => seek(0)}>
          <RestartIcon />
        </TransportButton>
        <TransportButton
          label={playing ? 'Pause replay' : 'Play replay'}
          onClick={toggle}
          primary
        >
          {playing ? <PauseIcon /> : atEnd ? <ReplayIcon /> : <PlayIcon />}
        </TransportButton>
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

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 5V2L7 7l5 5V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
