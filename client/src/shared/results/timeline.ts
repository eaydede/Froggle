import type { ScoredWord } from '../types';
import { wordRarity, type Rarity } from '../../pages/results/utils/wordRarity';

// Builds the results-page timeline model from a viewer's found words. Pure so
// the break/scale logic can be unit-tested apart from the React panel.
//
// The axis is *compressed*: a real game can open with a minute of staring or
// stall for two minutes mid-round, and a linear time axis would collapse every
// word into one bright clump with a vast empty margin. Instead, spans we judge
// to be breaks are drawn at a fixed small width and flagged, so the clusters
// and lulls that actually happened stay legible.

export interface TimelineMark {
  word: string;
  score: number;
  timeSeconds: number;
  /** Gap in seconds since the previous find (null for the first word). */
  deltaSeconds: number | null;
  /** True when the gap immediately before this find was judged a break. */
  breakBefore: boolean;
  /** Position along the compressed axis, 0–100. */
  xPct: number;
  rarity: Rarity;
}

export interface TimelineBreak {
  /** Compressed-axis span this break occupies, 0–100. */
  startPct: number;
  endPct: number;
  durationSeconds: number;
}

export interface TimelineModel {
  marks: TimelineMark[];
  breaks: TimelineBreak[];
  hasData: boolean;
  /** First → last find, in real seconds. */
  spanSeconds: number;
  /** Largest gap between consecutive finds, in real seconds. */
  longestLullSeconds: number;
}

// A gap shorter than this is never a break, however brisk the player's pace —
// keeps a fast solver's ordinary 15s pauses from reading as "went away".
const BREAK_MIN_SECONDS = 20;
// A gap longer than this many times the median inter-find gap is a break. The
// median adapts the sensitivity to the player's own pace.
const BREAK_MEDIAN_FACTOR = 6;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * @param words  the viewer's found words; entries without a `timeSeconds` are
 *   dropped (legacy words with no capture) so a partially-timed game still
 *   renders the words it does have times for.
 * @param timeLimit  the mode's time limit in seconds; 0/undefined means untimed
 *   (Zen), where the axis ends at the last find rather than a fixed deadline.
 */
export function buildTimeline(
  words: ScoredWord[],
  timeLimit: number,
): TimelineModel {
  const timed = words
    .filter((w): w is ScoredWord & { timeSeconds: number } =>
      typeof w.timeSeconds === 'number',
    )
    .sort((a, b) => a.timeSeconds - b.timeSeconds || b.score - a.score);

  if (timed.length === 0) {
    return {
      marks: [],
      breaks: [],
      hasData: false,
      spanSeconds: 0,
      longestLullSeconds: 0,
    };
  }

  const firstTime = timed[0].timeSeconds;
  const lastTime = timed[timed.length - 1].timeSeconds;

  // Inter-find gaps drive both break detection and the compressed width a
  // break collapses to.
  const interGaps: number[] = [];
  for (let i = 1; i < timed.length; i++) {
    interGaps.push(timed[i].timeSeconds - timed[i - 1].timeSeconds);
  }
  const medianGap = median(interGaps);
  const breakThreshold = Math.max(BREAK_MIN_SECONDS, medianGap * BREAK_MEDIAN_FACTOR);
  // A break collapses to this many display units — enough to read as a pause
  // without dominating. Falls back to a small constant when there's no median
  // yet (a single find, or all-identical spacing).
  const breakDisplay = medianGap > 0 ? medianGap * 1.5 : 8;

  const isBreak = (gap: number) => gap > breakThreshold;
  const displayOf = (gap: number) => (isBreak(gap) ? breakDisplay : gap);

  // The axis spans the whole game: a leading segment (start → first find) and,
  // for timed modes, a trailing segment (last find → deadline), so "slow to
  // start" and "time left on the clock" both show. Untimed games end at the
  // last find.
  const leadingGap = firstTime;
  const trailingGap = timeLimit > 0 ? Math.max(0, timeLimit - lastTime) : 0;

  let totalDisplay = displayOf(leadingGap);
  for (const gap of interGaps) totalDisplay += displayOf(gap);
  totalDisplay += displayOf(trailingGap);
  // Degenerate case (single find, untimed): give the axis unit width so the
  // lone mark lands mid-bar rather than dividing by zero.
  if (totalDisplay <= 0) totalDisplay = 1;

  const marks: TimelineMark[] = [];
  const breaks: TimelineBreak[] = [];

  const pushBreakZone = (fromDisplay: number, gap: number) => {
    if (!isBreak(gap)) return;
    breaks.push({
      startPct: (fromDisplay / totalDisplay) * 100,
      endPct: ((fromDisplay + breakDisplay) / totalDisplay) * 100,
      durationSeconds: gap,
    });
  };

  // Walk the compressed axis, emitting a mark per find and a zone per break.
  let cursor = 0;
  pushBreakZone(cursor, leadingGap);
  cursor += displayOf(leadingGap);

  for (let i = 0; i < timed.length; i++) {
    if (i > 0) {
      const gap = interGaps[i - 1];
      pushBreakZone(cursor, gap);
      cursor += displayOf(gap);
    }
    const w = timed[i];
    marks.push({
      word: w.word.toUpperCase(),
      score: w.score,
      timeSeconds: w.timeSeconds,
      deltaSeconds: i === 0 ? null : interGaps[i - 1],
      breakBefore: i === 0 ? isBreak(leadingGap) : isBreak(interGaps[i - 1]),
      xPct: (cursor / totalDisplay) * 100,
      rarity: wordRarity(w.score),
    });
  }

  return {
    marks,
    breaks,
    hasData: true,
    spanSeconds: lastTime - firstTime,
    longestLullSeconds: interGaps.reduce((max, g) => Math.max(max, g), 0),
  };
}

/** mm:ss for an elapsed-seconds value (rounds to whole seconds). */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Compact gap label, e.g. "+4s", "+1:20". */
export function formatDelta(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `+${total}s`;
  return `+${formatClock(total)}`;
}
