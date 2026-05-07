import { DailyRow, type DailyState } from "./DailyRow";
import type { PodiumRank } from "./RankBadge";
import type { DailyZenSession } from "../../../shared/api/gameApi";

interface ZenDailyCardProps {
  session: DailyZenSession | null;
  /** Player's rank on today's zen leaderboard. Only the top-3 are surfaced as a badge. */
  rank?: number | null;
  onPlay: () => void;
  onResume: () => void;
  onSeeResult: () => void;
  onSeeLeaderboard: () => void;
}

export function ZenDailyCard({
  session,
  rank,
  onPlay,
  onResume,
  onSeeResult,
  onSeeLeaderboard,
}: ZenDailyCardProps) {
  const state = deriveState(session);

  // Casual players opt out of the leaderboard for the day, so the rank
  // badge would be misleading — gate it on competitive mode. For
  // competitive players the badge appears as soon as a session exists
  // and tracks live as the session evolves (in-progress sessions are on
  // the zen leaderboard too).
  const isCompetitive = session?.is_competitive ?? false;
  const podium: PodiumRank | null =
    state !== "unplayed" && isCompetitive && (rank === 1 || rank === 2 || rank === 3)
      ? rank
      : null;

  return (
    <DailyRow
      mode="zen"
      label="Zen Daily"
      state={state}
      podium={podium}
      results={
        session
          ? {
              points: session.points,
              words: session.word_count,
              totalWords:
                state === "completed" ? session.total_findable : undefined,
            }
          : null
      }
      unplayedHint="No timer · find them all"
      onPrimary={
        state === "completed"
          ? onSeeResult
          : state === "in-progress"
            ? onResume
            : onPlay
      }
      onLeaderboard={onSeeLeaderboard}
    />
  );
}

function deriveState(session: DailyZenSession | null): DailyState {
  if (!session) return "unplayed";
  if (session.ended_at) return "completed";
  return "in-progress";
}
