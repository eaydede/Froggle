import type { DailyStats } from "../types";

interface StreakCardProps {
  stats: DailyStats;
}

export function StreakCard({ stats }: StreakCardProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] py-2.5 px-3.5 mx-[18px] mb-2"
      style={{ background: "var(--track)" }}
    >
      {/* Fire icon */}
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: "color-mix(in srgb, #d4713a 15%, var(--page-bg) 85%)",
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
          <path
            d="M8 1.5c0 0-1.5 2-2.5 3.5C4.5 6.5 4 7.5 4 9a4 4 0 008 0c0-1.5-.5-2.5-1.5-4C9.5 3.5 8 1.5 8 1.5z"
            fill="#d4713a"
          />
          <path
            d="M8 5c0 0-1 1.2-1.5 2.2C6 8.2 5.8 9 6 10a2.2 2.2 0 004 0c.2-1-.2-1.8-.7-2.8C8.8 6.2 8 5 8 5z"
            fill="#e8943a"
          />
        </svg>
      </div>

      {/* Label */}
      <span
        className="text-sm flex-1"
        style={{
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Streak
      </span>

      {/* Value + dots */}
      <div className="flex flex-col items-end gap-1">
        <span
          className="text-sm"
          style={{
            color: "var(--text)",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
          }}
        >
          {stats.currentStreak} days
        </span>
        <div className="flex gap-[3px]">
          {stats.streakDays.map((active, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: active ? "var(--accent)" : "var(--dot)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}