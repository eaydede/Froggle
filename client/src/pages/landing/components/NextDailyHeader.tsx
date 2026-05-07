import { useEffect, useState } from "react";
import { StreakBadge } from "./StreakBadge";

// Single shared "next daily reset" indicator + streak chip. The reset is
// the same wall-clock event for every daily mode, so it surfaces once
// above the row of daily cards instead of repeating per-card.

interface NextDailyHeaderProps {
  streak: number;
}

export function NextDailyHeader({ streak }: NextDailyHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Countdown />
      <span aria-hidden className="text-[color:var(--ink-faint)] text-[10px]">
        ·
      </span>
      <StreakBadge streak={streak} />
    </div>
  );
}

function Countdown() {
  const [msLeft, setMsLeft] = useState(msUntilNextDailyPST);
  useEffect(() => {
    const id = setInterval(() => setMsLeft(msUntilNextDailyPST()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-[5px] text-[11px] text-[color:var(--ink-soft)] tabular-nums font-[family-name:var(--font-ui)]"
      style={{ fontWeight: 500 }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="opacity-80"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Next puzzle in {formatCountdown(msLeft)}
    </div>
  );
}

function msUntilNextDailyPST(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  const s = Number(parts.find((p) => p.type === "second")!.value);
  return Math.max(0, (24 * 3600 - (h * 3600 + m * 60 + s)) * 1000);
}

function formatCountdown(ms: number): string {
  const totalS = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
