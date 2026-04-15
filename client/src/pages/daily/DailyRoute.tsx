import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../GameContext";
import { DailyPage } from "./DailyPage";
import type { DailyEntry, DailyStats } from "./types";
import {
  fetchDailyStats,
  fetchDailyResult,
  type DailyInfo,
  type DailyStatsResponse,
  type DailyStatsDay,
} from "../../shared/api/gameApi";
import { scoreWord } from "engine/scoring";
import { generateShareText } from "../results/utils/shareResults";

function adaptDay(day: DailyStatsDay, config: DailyInfo["config"]): DailyEntry {
  return {
    puzzleNumber: day.puzzleNumber,
    date: new Date(day.date + "T12:00:00"),
    state: day.state,
    points: day.points ?? undefined,
    wordsFound: day.wordsFound ?? undefined,
    longestWord: day.longestWord ?? undefined,
    longestWordDefinition: day.longestWordDefinition,
    stampTier: day.stampTier,
    playersCount: day.playersCount,
    config,
  };
}

// Countdown to next PST midnight, rendered in the user's local clock.
function useCountdownToNextPuzzle(): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const pstNowStr = new Date(now).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
    });
    const pstNow = new Date(pstNowStr);
    const pstMidnight = new Date(pstNow);
    pstMidnight.setHours(24, 0, 0, 0);
    const diffMs = pstMidnight.getTime() - pstNow.getTime();
    const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const minutes = Math.max(
      0,
      Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    );
    return `${hours}h ${minutes}m`;
  }, [now]);
}

export function DailyPuzzleRoute() {
  const navigate = useNavigate();
  const {
    dailyInfo,
    setDailyInfo,
    refreshDaily,
    createGame,
    startGame,
    game,
  } = useGame();

  const [statsResponse, setStatsResponse] = useState<DailyStatsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch stats + daily info in parallel. dailyInfo may already be in context
  // from an earlier visit; refresh so puzzle number and board are current.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDailyStats(), refreshDaily()])
      .then(([stats, info]) => {
        if (cancelled) return;
        setStatsResponse(stats);
        setDailyInfo(info);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // refreshDaily and setDailyInfo are stable context fns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries: DailyEntry[] = useMemo(() => {
    if (!statsResponse || !dailyInfo) return [];
    return statsResponse.days.map((d) => adaptDay(d, dailyInfo.config));
  }, [statsResponse, dailyInfo]);

  const stats: DailyStats = useMemo(
    () => ({
      currentStreak: statsResponse?.currentStreak ?? 0,
      streakDays: statsResponse?.streakDays ?? Array(7).fill(false),
      avgPoints: statsResponse?.avgPoints ?? 0,
      avgWords: statsResponse?.avgWords ?? 0,
    }),
    [statsResponse],
  );

  // Seeded lazily once entries are available so the carousel mounts
  // already pointing at today instead of animating from index 0.
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  useEffect(() => {
    if (currentIndex === null && entries.length > 0) {
      setCurrentIndex(entries.length - 1);
    }
  }, [entries.length, currentIndex]);

  const nextPuzzleCountdown = useCountdownToNextPuzzle();

  const handleChangeIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Start today's daily puzzle directly — no config step.
  const handleStartPuzzle = useCallback(async () => {
    if (!dailyInfo) return;
    if (!game) await createGame();
    await startGame(
      dailyInfo.config.timeLimit,
      dailyInfo.config.boardSize,
      dailyInfo.config.minWordLength,
      undefined,
      dailyInfo.seed,
    );
    navigate("/game");
  }, [dailyInfo, game, createGame, startGame, navigate]);

  const handleViewResults = useCallback(
    (_puzzleNumber: number) => {
      navigate(`/daily/results`);
    },
    [navigate],
  );

  const handleViewLeaderboard = useCallback(
    (puzzleNumber: number) => {
      const entry = entries.find((e) => e.puzzleNumber === puzzleNumber);
      if (!entry) {
        navigate('/leaderboard');
        return;
      }
      const dateStr = entry.date.toISOString().slice(0, 10);
      navigate(`/leaderboard?date=${dateStr}`);
    },
    [navigate, entries],
  );

  // Given a puzzle number in the current window, build the share text the
  // same way the results page does: fetch the submission, score each word
  // client-side, then generate the emoji histogram + link block.
  const getShareText = useCallback(
    async (puzzleNumber: number): Promise<string> => {
      const entry = entries.find((e) => e.puzzleNumber === puzzleNumber);
      if (!entry) return "";
      const dateStr = entry.date.toISOString().slice(0, 10);
      const result = await fetchDailyResult(dateStr);
      if (!result) return "";
      const scoredWords = result.found_words.map((word) => ({
        word,
        path: [],
        score: scoreWord(word),
      }));
      return generateShareText(scoredWords, { daily: { number: puzzleNumber } });
    },
    [entries],
  );

  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (loadError) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
        Couldn't load daily stats: {loadError}
      </div>
    );
  }

  if (!statsResponse || !dailyInfo || currentIndex === null) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

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
      getShareText={getShareText}
      onBack={handleBack}
    />
  );
}
