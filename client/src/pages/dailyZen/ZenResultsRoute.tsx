import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import {
  fetchDailyZenLeaderboard,
  fetchDailyZenCompare,
  fetchDailyZenResult,
  fetchDailyZenStats,
  type DailyStatsDay,
  type DailyZenLeaderboardResponse,
  type DailyZenResultResponse,
  type DailyZenStatsResponse,
} from '../../shared/api/gameApi';
import type { DailyEntry } from '../daily/types';
import { useShareText } from '../results/hooks/useShareText';
import { generateShareText } from '../results/utils/shareResults';
import { formatDateLabel } from '../../shared/utils/formatDate';
import { ZenModeBadge } from './components/ZenModeBadge';
import { DailyCompactPreviewPage } from '../results/DailyCompactPreviewPage';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function adaptDay(day: DailyStatsDay): DailyEntry {
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
    config: day.config,
  };
}

export function ZenResultsRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cachedDailyZen, dailyZenLoaded, authReady, session } = useGame();
  const urlDate = searchParams.get('date');
  const fromSource = searchParams.get('from');
  const initialCompareUserId = searchParams.get('compare');
  const targetDate = urlDate ?? cachedDailyZen?.date ?? null;

  const [result, setResult] = useState<DailyZenResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyZenLeaderboardResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [stats, setStats] = useState<DailyZenStatsResponse | null>(null);

  useEffect(() => {
    if (!authReady || !dailyZenLoaded || !targetDate) return;
    let cancelled = false;
    setLoaded(false);
    setResult(null);
    fetchDailyZenResult(targetDate)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, dailyZenLoaded, targetDate]);

  useEffect(() => {
    if (!authReady) return;
    fetchDailyZenStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !targetDate) return;
    fetchDailyZenLeaderboard(targetDate)
      .then(setLeaderboard)
      .catch(() => setLeaderboard(null));
  }, [authReady, targetDate]);

  const pickerEntries: DailyEntry[] = useMemo(() => {
    return stats?.days.map(adaptDay) ?? [];
  }, [stats]);

  const handleChangeDate = (iso: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const puzzleNumber = useMemo(() => {
    if (!targetDate || !stats) return cachedDailyZen?.number ?? 0;
    const day = stats.days.find((d) => d.date === targetDate);
    return day?.puzzleNumber ?? cachedDailyZen?.number ?? 0;
  }, [targetDate, stats, cachedDailyZen]);

  const { copied, share } = useShareText(() =>
    result
      ? generateShareText(result.found_words, {
          daily: { number: puzzleNumber, mode: 'zen' },
        })
      : '',
  );

  const leaderboardRows = useMemo(() => {
    const rankings = leaderboard?.rankings.points ?? [];
    const currentUserId = session?.user?.id;
    const top = rankings.slice(0, 3).map((entry) => ({
      rank: entry.rank,
      userId: entry.userId,
      name: entry.displayName,
      score: entry.points,
      isCurrentUser: entry.userId === currentUserId,
    }));

    const currentPlayer = leaderboard?.currentPlayer;
    const userInTop = currentPlayer?.rank != null && currentPlayer.rank <= 3;
    const you = currentPlayer && !userInTop
      ? {
          rank: currentPlayer.rank ?? Math.max(leaderboard?.totalPlayers ?? 0, top.length + 1),
          name: 'you',
          score: currentPlayer.points,
          isCurrentUser: true,
        }
      : null;

    return { top, you };
  }, [leaderboard, session?.user?.id]);

  if (!loaded || !targetDate) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  // No finalized result for the target date — bounce back to the landing card.
  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <DailyCompactPreviewPage
      mode="zen"
      dateLabel={`Zen Daily · ${formatDateLabel(targetDate)}`}
      results={{
        board: result.board,
        foundWords: result.found_words,
        missedWords: result.missed_words,
      }}
      game={{
        board: result.board,
        startedAt: 0,
        status: GameState.Finished,
        config: {
          durationSeconds: 0,
          boardSize: result.board.length,
          minWordLength: cachedDailyZen?.config.minWordLength ?? 4,
        },
      }}
      leaderboardTop={leaderboardRows.top}
      leaderboardYou={leaderboardRows.you}
      pointsRankings={leaderboard?.rankings.points.map((e) => ({
        userId: e.userId,
        rank: e.rank,
        isCurrentUser: e.userId === session?.user?.id,
      }))}
      totalPlayers={leaderboard?.totalPlayers}
      findPercents={result.find_percents}
      popularityStyle={result.find_percents ? 'inline' : undefined}
      onClose={() => {
        if (fromSource === 'leaderboard' && targetDate) {
          navigate(`/daily/zen/leaderboard?date=${targetDate}`);
        } else {
          navigate('/');
        }
      }}
      onHome={() => navigate('/')}
      onShare={share}
      shareCopied={copied}
      onOpenLeaderboard={() => navigate(`/daily/zen/leaderboard?date=${targetDate}`)}
      onLoadComparePlayer={(userId) => fetchDailyZenCompare(targetDate, userId)}
      initialCompareUserId={initialCompareUserId}
      pickerEntries={pickerEntries}
      onPickerSelect={handleChangeDate}
      todayDate={getTodayPST()}
      selectedDate={targetDate}
      heroAccessory={<ZenModeBadge isCompetitive={result.is_competitive} />}
    />
  );
}
