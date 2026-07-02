import {
  AppHeader,
  DailyCard,
  FeedbackButton,
  FreePlayCard,
  GauntletDailyCard,
  NextDailyHeader,
  ThemeTogglePill,
  ZenDailyCard,
} from "./components";
import { ExperimentalDailyCard } from "../dailyExperimental";
import type { DailyResults } from "./types";
import type { DailyZenSession, ProfileResponse, UpdateProfileResult } from "../../shared/api/gameApi";
import type { GauntletEntry } from "models/gauntlet";

interface LandingPageProps {
  dateLabel: string;
  streak: number;
  dailyConfig: { boardSize: number; timeLimit: number; minWordLength: number };
  dailyResults: DailyResults | null;
  dailyRank: number | null;
  zenSession: DailyZenSession | null;
  zenRank: number | null;
  gauntletEntry: GauntletEntry | null;
  onGauntletPlay: () => void;
  experimentalPlayed?: number;
  experimentalTotal?: number;
  onExperimentalOpen: () => void;
  displayName: string;
  nameProfile: ProfileResponse | null;
  onDisplayNameChange: (name: string) => Promise<UpdateProfileResult>;
  onDailyPlay: () => void;
  onDailySeeResult: () => void;
  onDailyLeaderboard: () => void;
  onZenPlay: () => void;
  onZenResume: () => void;
  onZenSeeResult: () => void;
  onZenLeaderboard: () => void;
  onFreePlayClick: () => void;
  onFreePlayHistory?: () => void;
  freePlayUnread?: number;
  freePlayPlayingCount?: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function LandingPage({
  dateLabel,
  streak,
  dailyConfig,
  dailyResults,
  dailyRank,
  zenSession,
  zenRank,
  gauntletEntry,
  onGauntletPlay,
  experimentalPlayed = 0,
  experimentalTotal = 0,
  onExperimentalOpen,
  displayName,
  nameProfile,
  onDisplayNameChange,
  onDailyPlay,
  onDailySeeResult,
  onDailyLeaderboard,
  onZenPlay,
  onZenResume,
  onZenSeeResult,
  onZenLeaderboard,
  onFreePlayClick,
  onFreePlayHistory,
  freePlayUnread,
  freePlayPlayingCount,
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
          nameProfile={nameProfile}
          onDisplayNameChange={onDisplayNameChange}
        />

        <div className="flex-1 flex flex-col justify-center gap-[10px]">
          <NextDailyHeader streak={streak} />

          <DailyCard
            config={dailyConfig}
            results={dailyResults}
            rank={dailyRank}
            onPlay={onDailyPlay}
            onSeeResult={onDailySeeResult}
            onSeeLeaderboard={onDailyLeaderboard}
          />
          <ZenDailyCard
            session={zenSession}
            rank={zenRank}
            onPlay={onZenPlay}
            onResume={onZenResume}
            onSeeResult={onZenSeeResult}
            onSeeLeaderboard={onZenLeaderboard}
          />
          <GauntletDailyCard entry={gauntletEntry} onPlay={onGauntletPlay} />
          <ExperimentalDailyCard
            played={experimentalPlayed}
            total={experimentalTotal}
            onOpen={onExperimentalOpen}
          />
          <FreePlayCard
            onClick={onFreePlayClick}
            onHistory={onFreePlayHistory}
            unread={freePlayUnread}
            playingCount={freePlayPlayingCount}
          />
        </div>

        <FeedbackButton />
      </div>
    </div>
  );
}
