import { DailyCard, FreePlayCard } from "./components";
import type { DailyPuzzleConfig, DailyResults } from "./types";
import "./landing.css";

interface LandingPageProps {
  dailyConfig: DailyPuzzleConfig;
  dailyResults: DailyResults | null;
  onDailyClick: () => void;
  onFreePlayClick: () => void;
}

export function LandingPage({
  dailyConfig,
  dailyResults,
  onDailyClick,
  onFreePlayClick,
}: LandingPageProps) {
  return (
    <div className="w-full max-w-[400px]">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-[1.35rem] tracking-[-0.025em]" style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900 }}>
          Froggle
        </h1>
        <p className="text-[0.75rem] font-medium text-[var(--text-muted)] mt-0.5">
          Choose a game mode
        </p>
      </div>

      {/* Mode cards */}
      <div className="flex flex-col gap-2.5">
        <DailyCard
          config={dailyConfig}
          results={dailyResults}
          onClick={onDailyClick}
        />
        <FreePlayCard onClick={onFreePlayClick} />
      </div>
    </div>
  );
}
