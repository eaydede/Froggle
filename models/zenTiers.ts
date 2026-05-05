// Tier ladder for the Daily Zen mode. Players earn tiers by clearing a
// percentage of the board's theoretical maximum score, so thresholds are
// fair across boards even though raw point ceilings vary widely day to day.
//
// Thresholds were calibrated against the first week of production data
// (see .context/analyze_zen_scores.ts). Revisit after ~30 more days.

export interface ZenTier {
  id: string;
  name: string;
  /** Achieved when (points / maxScore) >= threshold. Range: 0..1. */
  threshold: number;
  /** CSS variable name for the tier's accent color. Resolves against the
   *  rarity palette in tailwind-v2.css. */
  colorToken: string;
}

export const ZEN_TIERS: readonly ZenTier[] = [
  { id: 'scribe', name: 'Scribe', threshold: 0.03, colorToken: '--rarity-common' },
  { id: 'wordsmith', name: 'Wordsmith', threshold: 0.08, colorToken: '--rarity-rare' },
  { id: 'linguist', name: 'Linguist', threshold: 0.14, colorToken: '--rarity-epic' },
  { id: 'virtuoso', name: 'Virtuoso', threshold: 0.22, colorToken: '--rarity-mythic' },
  { id: 'legend', name: 'Legend', threshold: 0.28, colorToken: '--rarity-legendary' },
];

export function getZenTier(points: number, maxScore: number): ZenTier | null {
  if (maxScore <= 0) return null;
  const pct = points / maxScore;
  let achieved: ZenTier | null = null;
  for (const tier of ZEN_TIERS) {
    if (pct >= tier.threshold) achieved = tier;
    else break;
  }
  return achieved;
}

export function getNextZenTier(
  points: number,
  maxScore: number,
): { tier: ZenTier; pointsToNext: number } | null {
  if (maxScore <= 0) return null;
  const pct = points / maxScore;
  for (const tier of ZEN_TIERS) {
    if (pct < tier.threshold) {
      const pointsToNext = Math.ceil(tier.threshold * maxScore) - points;
      return { tier, pointsToNext: Math.max(1, pointsToNext) };
    }
  }
  return null;
}
