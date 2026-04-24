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
import type { RankingType } from './components';
import type { DailyEntry } from '../daily/types';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
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

  // ?date=YYYY-MM-DD takes precedence so the daily page's leaderboard button
  // can deep-link to whichever day the user was viewing.
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get('date') ?? dailyInfo?.date ?? getTodayPST(),
  );
  const [rankingType, setRankingType] = useState<RankingType>('points');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [config, setConfig] = useState<DailyInfo['config'] | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigator data comes from the same endpoint that drives the daily page,
  // so the picker is identical in data and UI across both pages.
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

  const rankings = useMemo(
    () => leaderboard?.rankings[rankingType] ?? [],
    [leaderboard, rankingType],
  );

  const topThreeUnit = useMemo(() => {
    switch (rankingType) {
      default:
        return 'pts';
      case 'words':
        return 'w';
    }
  }, [rankingType]);

  const topThree = useMemo(
    () =>
      rankings.slice(0, 3).map((r) => ({
        rank: r.rank as 1 | 2 | 3,
        displayName: r.displayName,
        value: r.value,
        unit: topThreeUnit,
      })),
    [rankings, topThreeUnit],
  );

  if (loading && !leaderboard) return null;

  return (
    <LeaderboardPage
      title={`Daily #${leaderboard?.puzzleNumber ?? ''}`}
      entries={entries}
      currentIndex={currentIndex}
      onChangeIndex={handleChangeIndex}
      rankingType={rankingType}
      onRankingTypeChange={setRankingType}
      topThree={topThree}
      rankings={rankings}
      onMyResults={() => navigate('/daily/results')}
      onBack={() => navigate(-1)}
      onCompare={
        leaderboard?.currentPlayer
          ? (userId) => navigate(`/daily/compare?date=${selectedDate}&user=${userId}`)
          : undefined
      }
    />
  );
}
