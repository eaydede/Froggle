// Podium rank surfaces, rendered next to the daily-card title (or wherever
// the card's badgeVariant places them) when the player finished in the top
// three. All variants pull from the same --podium-{gold,silver,bronze}
// tokens so the visual language stays consistent across placements.

export type PodiumRank = 1 | 2 | 3;
export type BadgeVariant = 'chip' | 'button' | 'score' | 'glyph';

const PODIUM = {
  1: { color: 'var(--podium-gold)', bg: 'var(--podium-gold-bg)', label: '1st', aria: '1st place' },
  2: { color: 'var(--podium-silver)', bg: 'var(--podium-silver-bg)', label: '2nd', aria: '2nd place' },
  3: { color: 'var(--podium-bronze)', bg: 'var(--podium-bronze-bg)', label: '3rd', aria: '3rd place' },
} as const;

/** Tinted pill variant — sits next to the card title. */
export function RankBadge({ rank }: { rank: PodiumRank }) {
  const { color, bg, label, aria } = PODIUM[rank];
  return (
    <span
      aria-label={aria}
      className="inline-flex items-center rounded-full px-1.5 py-[2px] text-caption uppercase tracking-[0.06em] tabular-nums leading-none font-[family-name:var(--font-structure)]"
      style={{ color, background: bg, fontWeight: 700 }}
    >
      {label}
    </span>
  );
}

/** Inline colored text — for use inside buttons or alongside other copy.
 *  Same type ramp as the surrounding text, just colored, so it doesn't add
 *  vertical weight. */
export function RankSuffix({ rank }: { rank: PodiumRank }) {
  const { color, label, aria } = PODIUM[rank];
  return (
    <span
      aria-label={aria}
      className="tabular-nums"
      style={{ color, fontWeight: 700 }}
    >
      {label}
    </span>
  );
}

/** Medal glyph in the podium color — distinguishable by color alone for the
 *  top three. Includes an aria-label for screen readers. */
export function RankGlyph({ rank }: { rank: PodiumRank }) {
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
