interface FreePlayCardProps {
  onClick: () => void;
}

export function FreePlayCard({ onClick }: FreePlayCardProps) {
  return (
    <div
      onClick={onClick}
      className="
        group
        bg-[var(--card)] rounded-2xl
        shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_4px_24px_rgba(0,0,0,0.06)]
        hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.08)]
        active:scale-[0.985] active:duration-[60ms]
        cursor-pointer select-none
        flex items-center justify-between
        transition-all duration-200
        sm:px-6 sm:py-5
      "
      style={{
        padding: "1.15rem 1.35rem",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div>
        <div className="text-[0.95rem] font-bold">Free Play</div>
        <div className="text-[0.68rem] font-medium text-[var(--text-muted)] mt-0.5">
          Pick your own settings
        </div>
      </div>
      <span className="text-[0.85rem] text-[var(--text-muted)] transition-all duration-200 group-hover:translate-x-[3px] group-hover:text-[var(--text-mid)]">
        →
      </span>
    </div>
  );
}
