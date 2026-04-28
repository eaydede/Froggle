interface DateChipProps {
  label: string;
  /** Omit to render a non-interactive label chip. */
  onClick?: () => void;
}

/** Bordered pill that displays a date label, used in topbars across the
 *  results / leaderboard pages. When `onClick` is provided, the chip
 *  becomes a button with a chevron affordance for opening a date picker. */
export function DateChip({ label, onClick }: DateChipProps) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className="flex items-center justify-center gap-1.5 py-[7px] px-3.5 rounded-[10px] bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[0_1px_2px_rgba(34,32,28,0.03)] cursor-pointer disabled:cursor-default hover:border-[var(--ink-border)] transition-colors duration-200 font-[family-name:var(--font-ui)]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="text-[13px] text-[color:var(--ink)] tabular-nums"
        style={{ fontWeight: 600, letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
      {interactive && (
        <span className="flex items-center text-[color:var(--ink-faint)]">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      )}
    </button>
  );
}
