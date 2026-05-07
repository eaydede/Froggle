import { DailyRow } from "./DailyRow";
import type { PodiumRank } from "./RankBadge";
import type { DailyResults } from "../types";

interface DailyCardProps {
  config: { boardSize: number; timeLimit: number; minWordLength: number };
  results: DailyResults | null;
  /** Player's rank for today's puzzle. Only the top-3 are surfaced as a badge. */
  rank?: number | null;
  onPlay: () => void;
  onSeeResult: () => void;
  onSeeLeaderboard: () => void;
}

export function DailyCard({
  config,
  results,
  rank,
  onPlay,
  onSeeResult,
  onSeeLeaderboard,
}: DailyCardProps) {
  const completed = results !== null;
  const podium: PodiumRank | null =
    completed && (rank === 1 || rank === 2 || rank === 3) ? rank : null;

  return (
    <DailyRow
      mode="timed"
      label="Timed Daily"
      state={completed ? "completed" : "unplayed"}
      podium={podium}
      results={
        results
          ? { points: results.points, words: results.words }
          : null
      }
      unplayedHint={formatTimedHint(config)}
      onPrimary={completed ? onSeeResult : onPlay}
      onLeaderboard={onSeeLeaderboard}
    />
  );
}

function formatTimedHint(config: { boardSize: number; timeLimit: number }) {
  const { boardSize, timeLimit } = config;
  if (!isFinite(timeLimit) || timeLimit <= 0) {
    return `No timer · ${boardSize}×${boardSize}`;
  }
  const minutes = Math.floor(timeLimit / 60);
  return `${minutes}-minute timer · ${boardSize}×${boardSize}`;
}
