import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InvalidReason, InvalidSubmission, Position } from 'models';
import type { ScoredWord } from '../types';
import { findWordPath } from '../utils/findWordPath';
import { RARITY_VAR } from '../../pages/results/utils/wordRarity';
import {
  buildTimeline,
  fractionAtTime,
  type TimelineMark,
  type TimelineModel,
  type TimelineSegment,
} from './timeline';

/** A rejected attempt placed on the compressed axis for the scrubber overlay. */
export interface ReplayAttempt {
  word: string;
  reason: InvalidReason;
  timeSeconds: number;
  /** Position along the compressed axis, 0–100. */
  xPct: number;
}

export type ReplayMode = 'fast' | 'realtime';

// Fast mode sweeps the whole compressed axis in this window regardless of game
// length, paced by word count and clamped. Realtime advances at the game's true
// pace instead (see advance()).
const MIN_REPLAY_MS = 3500;
const MAX_REPLAY_MS = 9000;
const MS_PER_WORD = 550;

// Fast playback lights each word's path quicker than the board's default tap
// cadence so the path finishes before the next find; realtime keeps the
// original cadence.
const REPLAY_FAST_STEP_MS = 32;

// Advance the 0–1 playhead one frame. Fast sweeps the compressed axis uniformly
// (narrow breaks pass quickly); realtime advances by real seconds scaled to the
// local compression slope, so the playhead crawls across a break for its full
// real duration.
function advance(
  fraction: number,
  dtMs: number,
  mode: ReplayMode,
  fastDurationMs: number,
  segments: TimelineSegment[],
): number {
  if (mode === 'fast') return Math.min(1, fraction + dtMs / fastDurationMs);
  const seg = segments.find((s) => fraction < s.xEnd);
  if (!seg || seg.seconds <= 0) {
    return Math.min(1, fraction + dtMs / fastDurationMs);
  }
  const fractionPerSecond = (seg.xEnd - seg.xStart) / seg.seconds;
  return Math.min(1, fraction + (dtMs / 1000) * fractionPerSecond);
}

// Playback clock. Starts at the end so the shared board/hero show the finished
// game on entry (no jump from the Results view); pressing a mode's button
// restarts from 0 and plays. Seeking pauses and jumps.
function useReplay(fastDurationMs: number, segments: TimelineSegment[]) {
  const [playhead, setPlayhead] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<ReplayMode>('realtime');
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const params = useRef({ mode, fastDurationMs, segments });
  params.current = { mode, fastDurationMs, segments };

  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;
      const p = params.current;
      setPlayhead((f) => advance(f, dt, p.mode, p.fastDurationMs, p.segments));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [playing]);

  useEffect(() => {
    if (playing && playhead >= 1) setPlaying(false);
  }, [playing, playhead]);

  const seek = useCallback((fraction: number) => {
    setPlaying(false);
    setPlayhead(Math.max(0, Math.min(1, fraction)));
  }, []);

  const playMode = useCallback(
    (next: ReplayMode) => {
      if (playing && mode === next) {
        setPlaying(false);
        return;
      }
      setMode(next);
      if (playhead >= 1) setPlayhead(0);
      setPlaying(true);
    },
    [playing, mode, playhead],
  );

  return { playhead, playing, mode, atEnd: playhead >= 1, playMode, seek };
}

export interface TimelineReplay {
  model: TimelineModel;
  marks: TimelineMark[];
  hasData: boolean;
  playhead: number;
  playing: boolean;
  mode: ReplayMode;
  atEnd: boolean;
  playMode: (mode: ReplayMode) => void;
  seek: (fraction: number) => void;
  currentIndex: number;
  current: TimelineMark | null;
  /** Rejected attempts placed on the axis — opt-in overlay on the scrubber. */
  attempts: ReplayAttempt[];
  /** Board highlight for the word the playhead has reached. */
  boardHighlightPath: Position[] | null;
  boardHighlightColor: string | null;
  boardStepMs: number | undefined;
  /** Axis end in seconds (deadline, or last find when untimed). */
  endSeconds: number;
  /** Score + word count accumulated up to the playhead, for the climbing hero. */
  pointsSoFar: number;
  wordsSoFar: number;
}

// The single replay controller: builds the timeline model, owns playback, and
// derives everything the shared board + hero and the timeline panel need. Lives
// above the swipe so the shared top can be driven by the playhead when the
// timeline view is active.
export function useTimelineReplay(
  foundWords: ScoredWord[],
  invalidSubmissions: InvalidSubmission[],
  board: string[][],
  timeLimit: number,
): TimelineReplay {
  const model = useMemo(
    () => buildTimeline(foundWords, timeLimit),
    [foundWords, timeLimit],
  );
  const marks = model.marks;

  const attempts = useMemo<ReplayAttempt[]>(() => {
    if (!model.hasData) return [];
    return invalidSubmissions.map((a) => ({
      word: a.word,
      reason: a.reason,
      timeSeconds: a.t,
      xPct: fractionAtTime(model.segments, a.t) * 100,
    }));
  }, [invalidSubmissions, model]);

  const durationMs = Math.max(
    MIN_REPLAY_MS,
    Math.min(MAX_REPLAY_MS, marks.length * MS_PER_WORD),
  );
  const { playhead, playing, mode, atEnd, playMode, seek } = useReplay(
    durationMs,
    model.segments,
  );

  const currentIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].xPct <= playhead * 100) idx = i;
      else break;
    }
    return idx;
  }, [marks, playhead]);

  // Prefer the mode-supplied path; solve as a fallback (daily sends found words
  // without paths, so the board can still replay them).
  const pathByWord = useMemo(() => {
    const map = new Map<string, Position[]>();
    for (const w of foundWords) {
      const upper = w.word.toUpperCase();
      map.set(upper, w.path.length ? w.path : findWordPath(board, upper) ?? []);
    }
    return map;
  }, [foundWords, board]);

  const current = currentIndex >= 0 ? marks[currentIndex] : null;
  const boardHighlightPath = current ? pathByWord.get(current.word) ?? null : null;
  const boardHighlightColor = current ? RARITY_VAR[current.rarity] : null;
  const boardStepMs = mode === 'fast' ? REPLAY_FAST_STEP_MS : undefined;
  const endSeconds =
    timeLimit > 0
      ? timeLimit
      : marks.length > 0
        ? marks[marks.length - 1].timeSeconds
        : 0;
  const pointsSoFar = marks
    .slice(0, currentIndex + 1)
    .reduce((sum, m) => sum + m.score, 0);
  const wordsSoFar = currentIndex + 1;

  return {
    model,
    marks,
    hasData: model.hasData,
    playhead,
    playing,
    mode,
    atEnd,
    playMode,
    seek,
    currentIndex,
    current,
    attempts,
    boardHighlightPath,
    boardHighlightColor,
    boardStepMs,
    endSeconds,
    pointsSoFar,
    wordsSoFar,
  };
}
