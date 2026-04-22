interface StreakBarProps {
  streak: number;
  /** Most recent day last. Max slot count renders as `days.length` dots. */
  days: boolean[];
  /** If true the last slot renders as "today, not yet played" (dashed);
   *  otherwise today renders filled and the whole bar shifts to the streak
   *  green palette to celebrate the completed run. */
  todayUnplayed: boolean;
}

export function StreakBar({ streak, days, todayUnplayed }: StreakBarProps) {
  const windowSize = days.length;
  const pastFilled = todayUnplayed
    ? "bg-[var(--ink-mid)]"
    : "bg-[var(--streak-green-soft)]";
  const pastEmpty = todayUnplayed
    ? "bg-[var(--ink-trace)]"
    : "bg-[var(--streak-green-soft)]";

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex justify-between items-baseline">
        <div className="flex items-baseline gap-2">
          <span
            className="text-display-md leading-none font-[family-name:var(--font-structure)] tracking-[-0.02em] tabular-nums"
            style={{ fontWeight: 700 }}
          >
            {streak}
          </span>
          <span className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 500 }}>
            day streak
          </span>
        </div>
        <span
          className="text-label-xs uppercase text-[color:var(--ink-soft)] tracking-[0.04em]"
          style={{ fontWeight: 600 }}
        >
          Last {windowSize} days
        </span>
      </div>
      <div className="flex gap-1">
        {days.map((filled, i) => {
          const isLast = i === days.length - 1;
          if (isLast && todayUnplayed) {
            return (
              <div
                key={i}
                className="flex-1 h-[7px] -mt-px rounded-[3px] bg-transparent border border-dashed border-[var(--ink-soft)]"
              />
            );
          }
          if (isLast) {
            return (
              <div
                key={i}
                className="flex-1 h-[7px] -mt-px rounded-[3px] bg-[var(--streak-green)] shadow-[0_0_0_2px_var(--streak-green-glow)]"
              />
            );
          }
          return (
            <div
              key={i}
              className={`flex-1 h-[5px] rounded-[3px] ${filled ? pastFilled : pastEmpty}`}
            />
          );
        })}
      </div>
    </div>
  );
}
