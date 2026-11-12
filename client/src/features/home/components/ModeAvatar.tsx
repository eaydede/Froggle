import type { DailyMode } from "./DailyRow";

// Per-mode visual identity. Each daily renders with a distinct glyph and
// accent tint so the lineup reads as different things at a glance — not
// just three rectangles with different labels. Backed by existing palette
// tokens so we don't introduce mode colors as new design knobs.

const MODE_TINT: Record<DailyMode, { bg: string; stroke: string }> = {
  timed: { bg: "var(--podium-gold-bg)", stroke: "var(--podium-gold)" },
  zen: { bg: "var(--streak-green-glow)", stroke: "var(--streak-green)" },
};

export function ModeAvatar({
  mode,
  size = 32,
}: {
  mode: DailyMode;
  size?: number;
}) {
  const { bg, stroke } = MODE_TINT[mode];
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: bg, color: stroke }}
    >
      <ModeGlyph mode={mode} size={Math.round(size * 0.55)} />
    </span>
  );
}

function ModeGlyph({ mode, size }: { mode: DailyMode; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24" as const,
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (mode === "timed") {
    return (
      <svg {...common}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6M12 5V2" />
      </svg>
    );
  }
  // zen
  return (
    <svg {...common}>
      <path d="M5 21c0-9 7-16 16-16-1 9-7 16-16 16z" />
      <path d="M5 21c4-4 8-8 16-16" />
    </svg>
  );
}

export function TrophyIcon({ size = 16 }: { size?: number }) {
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
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3" />
    </svg>
  );
}
