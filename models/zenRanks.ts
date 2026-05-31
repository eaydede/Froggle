// Rank ladder for the Daily Zen mode. Players earn ranks by clearing a
// percentage of the board's theoretical maximum score, so thresholds are
// fair across boards even though raw point ceilings vary widely day to day.
//
// Thresholds were calibrated against the first week of production data
// (see .context/analyze_zen_scores.ts). Revisit after ~30 more days.

export interface ZenRank {
  id: string;
  name: string;
  /** Achieved when (points / maxScore) >= threshold. Range: 0..1. */
  threshold: number;
  /** CSS variable name for the rank's accent color. Resolves against the
   *  rarity palette in tailwind.css. */
  colorToken: string;
}

export const ZEN_RANKS: readonly ZenRank[] = [
  { id: 'scribe', name: 'Scribe', threshold: 0.03, colorToken: '--rarity-common' },
  { id: 'wordsmith', name: 'Wordsmith', threshold: 0.08, colorToken: '--rarity-rare' },
  { id: 'linguist', name: 'Linguist', threshold: 0.14, colorToken: '--rarity-epic' },
  { id: 'virtuoso', name: 'Virtuoso', threshold: 0.22, colorToken: '--rarity-mythic' },
  { id: 'legend', name: 'Legend', threshold: 0.28, colorToken: '--rarity-legendary' },
];

export function getZenRank(points: number, maxScore: number): ZenRank | null {
  if (maxScore <= 0) return null;
  const pct = points / maxScore;
  let achieved: ZenRank | null = null;
  for (const rank of ZEN_RANKS) {
    if (pct >= rank.threshold) achieved = rank;
    else break;
  }
  return achieved;
}

export function getNextZenRank(
  points: number,
  maxScore: number,
): { rank: ZenRank; pointsToNext: number } | null {
  if (maxScore <= 0) return null;
  const pct = points / maxScore;
  for (const rank of ZEN_RANKS) {
    if (pct < rank.threshold) {
      const pointsToNext = Math.ceil(rank.threshold * maxScore) - points;
      return { rank, pointsToNext: Math.max(1, pointsToNext) };
    }
  }
  return null;
}
