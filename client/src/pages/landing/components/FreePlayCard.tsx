interface FreePlayCardProps {
  onClick: () => void;
}

export function FreePlayCard({ onClick }: FreePlayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full rounded-xl py-[14px] px-3 text-small text-[color:var(--ink)] bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] cursor-pointer select-none hover:-translate-y-px hover:border-[var(--ink-border)] active:scale-[0.98] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]"
      style={{ fontWeight: 600, WebkitTapHighlightColor: "transparent" }}
    >
      Free play
    </button>
  );
}
