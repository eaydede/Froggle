// Small medal glyph rendered next to the daily-card title when the player
// finished in the top three. Color is the only signifier — gold / silver /
// bronze — pulled from the existing podium tokens used elsewhere in the
// app, so the chip stays subtle and consistent.

export type PodiumRank = 1 | 2 | 3;

const PODIUM = {
  1: { color: 'var(--podium-gold)', aria: '1st place' },
  2: { color: 'var(--podium-silver)', aria: '2nd place' },
  3: { color: 'var(--podium-bronze)', aria: '3rd place' },
} as const;

export function RankBadge({ rank }: { rank: PodiumRank }) {
  const { color, aria } = PODIUM[rank];
  return (
    <svg
      role="img"
      aria-label={aria}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="14" r="6" fill={color} fillOpacity="0.16" />
      <path d="M8 4l3 6M16 4l-3 6" />
      <circle cx="12" cy="14" r="2.5" fill={color} stroke="none" />
    </svg>
  );
}
