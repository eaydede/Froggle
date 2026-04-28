import { AppHeader, CardCarousel, DailyCard, FreePlayCard, ZenDailyCard, ThemeTogglePill } from "./components";
import type { DailyResults } from "./types";
import type { DailyZenSession } from "../../shared/api/gameApi";

interface LandingPageProps {
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  dailyResults: DailyResults | null;
  zenSession: DailyZenSession | null;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onDailyPlay: () => void;
  onDailySeeResult: () => void;
  onDailyLeaderboard: () => void;
  onZenPlay: () => void;
  onZenResume: () => void;
  onZenSeeResult: () => void;
  onZenLeaderboard: () => void;
  onFreePlayClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function LandingPage({
  dateLabel,
  streak,
  streakDays,
  dailyResults,
  zenSession,
  displayName,
  onDisplayNameChange,
  onDailyPlay,
  onDailySeeResult,
  onDailyLeaderboard,
  onZenPlay,
  onZenResume,
  onZenSeeResult,
  onZenLeaderboard,
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
          <CardCarousel>
            <DailyCard
              dateLabel={dateLabel}
              streak={streak}
              streakDays={streakDays}
              results={dailyResults}
              onPlay={onDailyPlay}
              onSeeResult={onDailySeeResult}
              onSeeLeaderboard={onDailyLeaderboard}
            />
            <ZenDailyCard
              dateLabel={dateLabel}
              session={zenSession}
              onPlay={onZenPlay}
              onResume={onZenResume}
              onSeeResult={onZenSeeResult}
              onSeeLeaderboard={onZenLeaderboard}
            />
          </CardCarousel>
          <FreePlayCard onClick={onFreePlayClick} />
        </div>
      </div>
    </div>
  );
}
