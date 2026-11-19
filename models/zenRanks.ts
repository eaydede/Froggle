import type { ResultsRankRung } from './results.js';

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
      const pointsToNext = getZenRankTarget(rank, maxScore) - points;
      return { rank, pointsToNext: Math.max(1, pointsToNext) };
    }
  }
  return null;
}

/** Preserve Zen's entry percentages and its finite Legend peak in results. */
export function getZenRankRungs(maxScore: number): ResultsRankRung[] {
  if (maxScore <= 0) return [];
  const ranks = [
    { id: 'unranked', name: 'Unranked', colorToken: '--ink-soft', threshold: 0 },
    ...ZEN_RANKS,
  ];
  return ranks.map((rank, ordinal) => ({
    id: rank.id,
    name: rank.name,
    colorToken: rank.colorToken,
    ordinal,
    points: getZenRankTarget(rank, maxScore),
    nextPoints: ranks[ordinal + 1] ? getZenRankTarget(ranks[ordinal + 1], maxScore) : maxScore,
  })).reverse();
}

/** Match the ratio comparison used by getZenRank at floating-point boundaries. */
export function getZenRankTarget(rank: Pick<ZenRank, 'threshold'>, maxScore: number): number {
  const candidate = Math.ceil(rank.threshold * maxScore);
  return candidate > 0 && (candidate - 1) / maxScore >= rank.threshold ? candidate - 1 : candidate;
}
