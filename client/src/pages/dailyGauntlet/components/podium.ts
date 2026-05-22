import type { PodiumRank } from '../../landing/components/RankBadge';

export function podiumOf(rank: number | null | undefined): PodiumRank | null {
  if (rank === 1 || rank === 2 || rank === 3) return rank;
  return null;
}

// Tints a top-3 rank number with its medal color. Used in the standings
// table so the medal hierarchy is baked into the number itself — no
// separate medal column nudging the name column.
export function podiumColor(rank: PodiumRank | null): string {
  switch (rank) {
    case 1: return 'var(--podium-gold)';
    case 2: return 'var(--podium-silver)';
    case 3: return 'var(--podium-bronze)';
    case null:
    default: return 'var(--ink)';
  }
}
