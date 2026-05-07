/**
 * Formats a 0–100 percentage for the All-words popularity column.
 *
 * Boundary handling matters here:
 *   - Sub-1% finds get `<1%` instead of `0%` so a rare-but-real find
 *     never reads as "nobody got this".
 *   - Anything ≥99.5 rounds to `100%` so the column never shows a
 *     misleading `99%` for a word every player got.
 *   - Everything in between rounds to the nearest integer.
 */
export function formatPercent(pct: number): string {
  if (pct < 1) return '<1%';
  if (pct >= 99.5) return '100%';
  return `${Math.round(pct)}%`;
}
