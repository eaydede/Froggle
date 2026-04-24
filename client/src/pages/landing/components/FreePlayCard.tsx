interface FreePlayCardProps {
  onClick: () => void;
}

export function FreePlayCard({ onClick }: FreePlayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Free play"
      className="group flex items-center justify-between gap-3 w-full rounded-2xl px-5 py-4 bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] cursor-pointer select-none text-left hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="flex flex-col gap-[3px]">
        <span
          className="text-body-lg leading-none tracking-[-0.01em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Free play
        </span>
        <span
          className="text-xs leading-[1.3] text-[color:var(--ink-soft)]"
          style={{ fontWeight: 500 }}
        >
          Custom board, time, and letters
        </span>
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0 text-[color:var(--ink-faint)] group-hover:text-[color:var(--ink-muted)] group-hover:translate-x-[3px] transition-[transform,color] duration-200"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
