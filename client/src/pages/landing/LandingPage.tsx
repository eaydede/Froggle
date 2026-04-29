import { AppHeader, DailyCard, FreePlayCard, ZenDailyCard, ThemeTogglePill } from "./components";
import type { DailyResults } from "./types";
import type { DailyZenSession } from "../../shared/api/gameApi";

interface LandingPageProps {
  dateLabel: string;
  streak: number;
  dailyConfig: { boardSize: number; timeLimit: number; minWordLength: number };
  zenConfig: { boardSize: number; minWordLength: number };
  dailyResults: DailyResults | null;
  dailyRank: number | null;
  zenSession: DailyZenSession | null;
  zenRank: number | null;
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
  dailyConfig,
  zenConfig,
  dailyResults,
  dailyRank,
  zenSession,
  zenRank,
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

      <div className="w-full max-w-[360px] min-h-[90%] flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <AppHeader
          dateLabel={dateLabel}
          displayName={displayName}
          onDisplayNameChange={onDisplayNameChange}
        />

        <div className="flex-1 flex flex-col justify-center gap-[14px]">
          <DailyCard
            streak={streak}
            config={dailyConfig}
            results={dailyResults}
            rank={dailyRank}
            onPlay={onDailyPlay}
            onSeeResult={onDailySeeResult}
            onSeeLeaderboard={onDailyLeaderboard}
          />
          <ZenDailyCard
            session={zenSession}
            config={zenConfig}
            rank={zenRank}
            onPlay={onZenPlay}
            onResume={onZenResume}
            onSeeResult={onZenSeeResult}
            onSeeLeaderboard={onZenLeaderboard}
          />
          <FreePlayCard onClick={onFreePlayClick} />
        </div>
      </div>
    </div>
  );
}
