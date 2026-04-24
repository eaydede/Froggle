import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchLeaderboard,
  fetchDailyStats,
  fetchDaily,
  type LeaderboardResponse,
  type DailyStatsResponse,
  type DailyStatsDay,
  type DailyInfo,
} from '../../shared/api/gameApi';
import { LeaderboardPage } from './LeaderboardPage';
import { useShareText } from '../results/hooks/useShareText';
import type { DailyEntry } from '../daily/types';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function formatDateLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function adaptDay(day: DailyStatsDay, config: DailyInfo['config']): DailyEntry {
  return {
    puzzleNumber: day.puzzleNumber,
    date: new Date(day.date + 'T12:00:00'),
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

export function LeaderboardRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dailyInfo } = useGame();

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get('date') ?? dailyInfo?.date ?? getTodayPST(),
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [config, setConfig] = useState<DailyInfo['config'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDailyStats(), fetchDaily()]).then(([s, info]) => {
      setStats(s);
      setConfig(info.config);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(selectedDate).then((data) => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, [selectedDate]);

  const entries: DailyEntry[] = useMemo(() => {
    if (!stats || !config) return [];
    return stats.days.map((d) => adaptDay(d, config));
  }, [stats, config]);

  const currentIndex = useMemo(() => {
    if (entries.length === 0) return 0;
    const idx = entries.findIndex((e) => e.date.toISOString().slice(0, 10) === selectedDate);
    return idx >= 0 ? idx : entries.length - 1;
  }, [entries, selectedDate]);

  const handleChangeIndex = useCallback(
    (index: number) => {
      const entry = entries[index];
      if (!entry) return;
      setSelectedDate(entry.date.toISOString().slice(0, 10));
    },
    [entries],
  );

  const pointsRankings = leaderboard?.rankings.points ?? [];

  // Top-3 for the podium. Handles the common case but also degrades to
  // the first N entries when a puzzle has fewer than three players.
  const podium = useMemo(
    () =>
      pointsRankings.slice(0, 3).map((r) => ({
        rank: r.rank as 1 | 2 | 3,
        name: r.displayName,
        score: r.value,
        userId: r.userId,
        isCurrentUser: r.isCurrentUser,
      })),
    [pointsRankings],
  );

  const rankingsForList = useMemo(
    () =>
      pointsRankings.map((r) => ({
        rank: r.rank,
        userId: r.userId,
        displayName: r.displayName,
        subLabel: r.subLabel,
        value: r.value,
        isCurrentUser: r.isCurrentUser,
      })),
    [pointsRankings],
  );

  const youFallback = leaderboard?.currentPlayer
    ? `#${leaderboard.currentPlayer.rank}`
    : undefined;

  const { share } = useShareText(() => {
    const url = `${window.location.origin}/leaderboard?date=${selectedDate}`;
    return `Daily #${leaderboard?.puzzleNumber ?? ''} leaderboard — ${url}`;
  });

  if (loading && !leaderboard) return null;

  return (
    <LeaderboardPage
      dateLabel={formatDateLabel(selectedDate)}
      entries={entries}
      currentIndex={currentIndex}
      onChangeIndex={handleChangeIndex}
      podium={podium}
      rankings={rankingsForList}
      totalPlayers={leaderboard?.totalPlayers ?? 0}
      avgScore={leaderboard?.avgScore ?? 0}
      youTopPercent={leaderboard?.currentPlayer?.topPercent ?? null}
      youFallback={youFallback}
      onBack={() => navigate('/')}
      onShare={share}
      onCompare={
        leaderboard?.currentPlayer
          ? (userId) => navigate(`/daily/compare?date=${selectedDate}&user=${userId}`)
          : undefined
      }
    />
  );
}
