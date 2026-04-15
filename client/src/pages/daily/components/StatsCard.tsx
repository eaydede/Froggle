import type { DailyStats } from "../types";

interface StatsCardProps {
  stats: DailyStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] py-2.5 px-3.5 mb-2 min-h-[30px]"
      style={{ background: "var(--track)" }}
    >
      {/* Chart icon */}
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: "color-mix(in srgb, var(--accent) 15%, var(--page-bg) 85%)",
        }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          className="w-3 h-3"
        >
          <path d="M3 12l3-4 2.5 2L12 4" />
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
        7 day avg
      </span>

      {/* Values */}
      <span
        className="text-sm"
        style={{
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
        }}
      >
        {Math.round(stats.avgPoints)} pts
      </span>
      <span
        className="text-sm"
        style={{
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
        }}
      >
        {Math.round(stats.avgWords)} words
      </span>
    </div>
  );
}