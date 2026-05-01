// Visual indicator of the zen-mode choice the player committed to for the
// day. Used on the game, results, and landing surfaces so the chosen mode
// stays present once the gate is past. Tea cup = casual, trophy = compete.

interface ZenModeBadgeProps {
  isCompetitive: boolean;
  /** When false, render the icon chip alone (no text label). Use in
   *  cramped spots like the in-game footer. Defaults to true. */
  showLabel?: boolean;
}

export function ZenModeBadge({ isCompetitive, showLabel = true }: ZenModeBadgeProps) {
  const Icon = isCompetitive ? TrophyIcon : TeaIcon;
  const label = isCompetitive ? 'Compete' : 'Casual';
  return (
    <span
      className="inline-flex items-center gap-1.5 h-[22px] pl-1 pr-2 rounded-full bg-[var(--ink-whisper)] border border-[var(--ink-border-subtle)] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
      style={{ fontWeight: 700 }}
      aria-label={`${label} mode`}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--ink)] text-[color:var(--ink-inverse)]"
      >
        <Icon size={11} />
      </span>
      {showLabel && (
        <span className="text-[10px] uppercase tracking-[0.08em] leading-none">
          {label}
        </span>
      )}
    </span>
  );
}

export function TeaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
      <path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
      <path d="M8 3v2" />
      <path d="M12 3v2" />
    </svg>
  );
}

export function TrophyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 5H5a2 2 0 0 0 0 4h2" />
    </svg>
  );
}
