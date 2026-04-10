import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchLeaderboard,
  fetchDailyHistory,
  type LeaderboardResponse,
  type DailyHistoryEntry,
} from '../../shared/api/gameApi';
import { LeaderboardPage } from './LeaderboardPage';
import type { RankingType } from './components/RankingSelector';
import type { DailyNavEntry } from './components/DailyNav';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function LeaderboardRoute() {
  const navigate = useNavigate();
  const { dailyInfo } = useGame();

  const [selectedDate, setSelectedDate] = useState<string>(dailyInfo?.date ?? getTodayPST());
  const [rankingType, setRankingType] = useState<RankingType>('points');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [history, setHistory] = useState<DailyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's history for the nav dropdown
  useEffect(() => {
    fetchDailyHistory().then(({ entries }) => setHistory(entries));
  }, []);

  // Fetch leaderboard when date changes
  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(selectedDate).then((data) => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, [selectedDate]);

  // Map history to DailyNav entries, injecting rank from current leaderboard
  const dailyEntries: DailyNavEntry[] = useMemo(() => {
    const currentUserRank = leaderboard?.rankings.points.find((r) => r.isCurrentUser)?.rank ?? 0;
    return history.map((e) => ({
      date: e.date,
      puzzleNumber: e.puzzleNumber,
      points: e.points,
      wordsFound: e.wordsFound,
      rank: e.date === selectedDate ? currentUserRank : 0,
      isToday: e.isToday,
    }));
  }, [history, leaderboard, selectedDate]);

  const rankings = useMemo(
    () => leaderboard?.rankings[rankingType] ?? [],
    [leaderboard, rankingType],
  );

  const topThreeUnit = useMemo(() => {
    switch(rankingType){
      default:
        return "pts"
      case "words":
        return "w"
    }
  }, [rankingType])

  const topThree = useMemo(
    () => rankings.slice(0, 3).map((r) => ({
      rank: r.rank as 1 | 2 | 3,
      displayName: r.displayName,
      value: r.value,
      unit: topThreeUnit,
    })),
    [rankings, topThreeUnit],
  );

  // The rank on the player card should update based on the active ranking type
  const currentUserRank = useMemo(
    () => rankings.find((r) => r.isCurrentUser)?.rank ?? 0,
    [rankings],
  );

  const playerCard = useMemo(() => {
    if (!leaderboard?.currentPlayer) {
      return {
        points: 0,
        wordsFound: 0,
        longestWord: '',
        rank: 0,
        totalPlayers: leaderboard?.totalPlayers ?? 0,
        topPercent: null,
        accolade: "Play today's daily to see your stats!",
      };
    }
    return {
      ...leaderboard.currentPlayer,
      rank: currentUserRank || leaderboard.currentPlayer.rank,
    };
  }, [leaderboard, currentUserRank]);

  const handlePrev = useCallback(() => {
    const idx = dailyEntries.findIndex((e) => e.date === selectedDate);
    if (idx < dailyEntries.length - 1) setSelectedDate(dailyEntries[idx + 1].date);
  }, [dailyEntries, selectedDate]);

  const handleNext = useCallback(() => {
    const idx = dailyEntries.findIndex((e) => e.date === selectedDate);
    if (idx > 0) setSelectedDate(dailyEntries[idx - 1].date);
  }, [dailyEntries, selectedDate]);

  const hasNext = useMemo(() => {
    const idx = dailyEntries.findIndex((e) => e.date === selectedDate);
    return idx > 0;
  }, [dailyEntries, selectedDate]);

  if (loading && !leaderboard) return null;

  return (
    <LeaderboardPage
      title={`Daily #${leaderboard?.puzzleNumber ?? ''}`}
      dailyEntries={dailyEntries}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      onPrev={handlePrev}
      onNext={handleNext}
      hasNext={hasNext}
      playerCard={playerCard}
      rankingType={rankingType}
      onRankingTypeChange={setRankingType}
      topThree={topThree}
      rankings={rankings}
      onMyResults={() => navigate('/daily/results')}
      onBack={() => navigate('/')}
    />
  );
}
