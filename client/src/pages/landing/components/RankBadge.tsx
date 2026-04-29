// Small podium badge rendered next to a daily-card title when the player
// finished in the top three. Uses the same podium-color tokens the
// LeaderboardList rank numbers use, on a tinted background, so it reads as
// a subtle chip — not a hero element.

interface RankBadgeProps {
  rank: 1 | 2 | 3;
}

const PODIUM = {
  1: { color: 'var(--podium-gold)', bg: 'var(--podium-gold-bg)', label: '1st' },
  2: { color: 'var(--podium-silver)', bg: 'var(--podium-silver-bg)', label: '2nd' },
  3: { color: 'var(--podium-bronze)', bg: 'var(--podium-bronze-bg)', label: '3rd' },
} as const;

export function RankBadge({ rank }: RankBadgeProps) {
  const { color, bg, label } = PODIUM[rank];
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-[2px] text-caption uppercase tracking-[0.06em] tabular-nums leading-none font-[family-name:var(--font-structure)]"
      style={{ color, background: bg, fontWeight: 700 }}
    >
      {label}
    </span>
  );
}
