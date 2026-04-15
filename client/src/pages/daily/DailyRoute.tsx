import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../GameContext";
import { DailyPage } from "./DailyPage";
import type { DailyEntry, DailyStats } from "./types";

export function DailyPuzzleRoute() {
  const navigate = useNavigate();
  const game = useGame();

  // ── Data mapping ─────────────────────────────────────────────
  // TODO: Replace stubs with actual data from useGame().
  //
  // Build the entries array from your daily history. Each entry
  // maps a DailyInfo + the player's result for that day into the
  // shape the page component expects.
  //
  // Example:
  //
  // const entries: DailyEntry[] = useMemo(() => {
  //   return game.dailyHistory.map((daily) => ({
  //     puzzleNumber: daily.number,
  //     date: new Date(daily.date),
  //     state: daily.completed
  //       ? "completed"
  //       : daily.isToday
  //         ? "unplayed"
  //         : "missed",
  //     points: daily.score,
  //     wordsFound: daily.wordsFound,
  //     longestWord: daily.longestWord,
  //     longestWordDefinition: daily.longestWordDefinition,
  //     stampTier: daily.stampTier ?? null,
  //     playersCount: daily.playersCount,
  //     config: daily.config,
  //   }));
  // }, [game.dailyHistory]);

  const entries: DailyEntry[] = useMemo(() => [], []);

  const stats: DailyStats = useMemo(
    () => ({
      currentStreak: 0,
      streakDays: [false, false, false, false, false, false, false],
      avgPoints: 0,
      avgWords: 0,
    }),
    [],
  );

  // ── Index state ──────────────────────────────────────────────
  // Start on the most recent entry (today)
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(entries.length - 1, 0),
  );

  // ── Countdown ────────────────────────────────────────────────
  const nextPuzzleCountdown = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(
      (diff % (1000 * 60 * 60)) / (1000 * 60),
    );
    return `${hours}h ${minutes}m`;
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleChangeIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleStartPuzzle = useCallback(() => {
    // TODO: Adjust route to match your router config
    navigate("/daily/play");
  }, [navigate]);

  const handleViewResults = useCallback(
    (puzzleNumber: number) => {
      navigate(`/daily/${puzzleNumber}/results`);
    },
    [navigate],
  );

  const handleViewLeaderboard = useCallback(
    (puzzleNumber: number) => {
      navigate(`/daily/${puzzleNumber}/leaderboard`);
    },
    [navigate],
  );

  const handleShare = useCallback((_puzzleNumber: number) => {
    // TODO: Implement share (Web Share API, clipboard fallback, etc.)
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <DailyPage
      entries={entries}
      stats={stats}
      currentIndex={currentIndex}
      nextPuzzleCountdown={nextPuzzleCountdown}
      onChangeIndex={handleChangeIndex}
      onStartPuzzle={handleStartPuzzle}
      onViewResults={handleViewResults}
      onViewLeaderboard={handleViewLeaderboard}
      onShare={handleShare}
      onBack={handleBack}
    />
  );
}