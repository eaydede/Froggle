import { AppHeader, DailyCard, FreePlayCard, ThemeTogglePill } from "./components";
import type { DailyResults } from "./types";

interface LandingPageProps {
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  dailyResults: DailyResults | null;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onDailyPlay: () => void;
  onDailySeeResult: () => void;
  onDailyLeaderboard: () => void;
  onFreePlayClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function LandingPage({
  dateLabel,
  streak,
  streakDays,
  dailyResults,
  displayName,
  onDisplayNameChange,
  onDailyPlay,
  onDailySeeResult,
  onDailyLeaderboard,
  onFreePlayClick,
  theme,
  onToggleTheme,
}: LandingPageProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <ThemeTogglePill theme={theme} onToggle={onToggleTheme} />

      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <AppHeader
          displayName={displayName}
          onDisplayNameChange={onDisplayNameChange}
        />

        <div className="flex-1 flex flex-col justify-center gap-[14px]">
          <DailyCard
            dateLabel={dateLabel}
            streak={streak}
            streakDays={streakDays}
            results={dailyResults}
            onPlay={onDailyPlay}
            onSeeResult={onDailySeeResult}
            onSeeLeaderboard={onDailyLeaderboard}
          />
          <FreePlayCard onClick={onFreePlayClick} />
        </div>
      </div>
    </div>
  );
}
