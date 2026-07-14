// Per-word find-time capture for game timelines.
//
// Every results table carries a `word_times` JSON array parallel to its
// `found_words`: word_times[i] is the elapsed play time in seconds (measured
// from the session's started_at) at which found_words[i] was found. A null
// entry means the time is unknown — a word recorded before timing capture
// existed, or one appended to a legacy in-progress row.
//
// This lives in one place because every mode's submit path repeats the same
// read-pad-append shape. Keeping it a single seam is what guarantees the
// alignment invariant — word_times.length === found_words.length — can't
// drift independently per mode.

// Elapsed seconds from session start to `now`, floored at zero and rounded to
// 0.1s: fine enough to cluster finds on a timeline, coarse enough to keep the
// stored array compact.
export function elapsedSeconds(startedAt: Date, now: Date = new Date()): number {
  const raw = (now.getTime() - startedAt.getTime()) / 1000;
  return Math.max(0, Math.round(raw * 10) / 10);
}

// jsonb columns come back parsed (an array) from the driver, but the same rows
// can also surface as a JSON string depending on the query path — mirror how
// found_words is parsed and accept both. Anything unrecognized reads as empty.
export function parseWordTimes(raw: unknown): (number | null)[] {
  if (Array.isArray(raw)) return raw as (number | null)[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Appends one offset per newly-found word while keeping the array index-aligned
// with found_words. `priorWordCount` is found_words.length *before* this
// submission; any shortfall (a row whose word list predates this column) is
// padded with null so index i always refers to word i. `addedCount` is usually
// 1, but a single Golden Ticket submission can resolve several words at once,
// all sharing the same offset.
export function appendWordTimes(
  priorTimes: (number | null)[],
  priorWordCount: number,
  addedCount: number,
  offsetSeconds: number,
): (number | null)[] {
  const times = priorTimes.slice(0, priorWordCount);
  while (times.length < priorWordCount) times.push(null);
  for (let i = 0; i < addedCount; i++) times.push(offsetSeconds);
  return times;
}
