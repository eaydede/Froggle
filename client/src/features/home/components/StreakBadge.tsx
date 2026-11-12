interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const active = streak > 0;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] leading-none " +
        (active
          ? "bg-[var(--streak-green)] text-white"
          : "bg-[var(--ink-trace)] text-[color:var(--ink-soft)]")
      }
      style={{ fontWeight: 600 }}
    >
      <svg width="10" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.5 1.5c.4 4 3.6 4.7 4.5 8.5 1.2 5-2.4 9-6 10 3-3 .5-6-.5-7.5C9 16 7.5 17.5 7.5 20.5c0 .8.2 1.4.5 2-3-1-6-4-6-9 0-4 2.5-6 4-9 .9 2 2.5 3 4 3.5C12 6.5 13.5 5 13.5 1.5z" />
      </svg>
      <span className="text-caption tabular-nums">{streak}-day streak</span>
    </span>
  );
}
