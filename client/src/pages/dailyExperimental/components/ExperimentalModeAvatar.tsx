import type { ExperimentalModeKey } from 'models/experimental';

// Per-mode glyph + tint for the hub tiles, plus a shared "beaker" avatar for
// the landing entry so the experimental group reads as a lab of prototypes.
// Tints reuse existing palette tokens rather than introducing mode colors as
// new design knobs.

const MODE_TINT: Record<ExperimentalModeKey, { bg: string; stroke: string }> = {
  // Time is Money's identity comes from its growing-timer affordance (blue
  // overflow), so the tile reads blue rather than gold. Golden Ticket keeps
  // the podium-gold hue for the wildcard star.
  'time-is-money': { bg: 'var(--compare-you-bg)', stroke: 'var(--compare-you)' },
  'golden-ticket': { bg: 'var(--podium-gold-bg)', stroke: 'var(--podium-gold)' },
};

export function ExperimentalModeAvatar({
  mode,
  size = 32,
}: {
  mode: ExperimentalModeKey;
  size?: number;
}) {
  const { bg, stroke } = MODE_TINT[mode];
  const glyphSize = Math.round(size * 0.55);
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: bg, color: stroke }}
    >
      {mode === 'time-is-money' ? (
        <ClockCoinGlyph size={glyphSize} />
      ) : (
        <StarGlyph size={glyphSize} />
      )}
    </span>
  );
}

// Beaker — the experimental group's identity on the landing screen.
export function ExperimentalGroupAvatar({ size = 32 }: { size?: number }) {
  const glyphSize = Math.round(size * 0.58);
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0 bg-[var(--ink-whisper)] text-[color:var(--ink-soft)]"
      style={{ width: size, height: size }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3" />
        <path d="M7 15h10" />
      </svg>
    </span>
  );
}

function ClockCoinGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M12 12h.01" />
    </svg>
  );
}

// Five-point star for the Golden Ticket avatar. Filled with the current stroke
// colour so it reads as a solid gold shape at small sizes.
function StarGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l2.5 6.2L21 10l-5 4.3L17.5 21 12 17.5 6.5 21 8 14.3 3 10l6.5-0.8L12 3z" />
    </svg>
  );
}
