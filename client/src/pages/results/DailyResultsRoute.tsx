import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import {
  fetchDailyResult,
  fetchDailyStats,
  fetchLeaderboard,
  type DailyResultResponse,
  type DailyStatsDay,
  type DailyStatsResponse,
  type LeaderboardResponse,
} from '../../shared/api/gameApi';
import { scoreWord } from '../../shared/utils/score';
import { ResultsPage, type DailyResultsExtras } from './ResultsPage';
import type { LeaderboardTeaserEntry } from './components/LeaderboardTeaser';
import type { DailyEntry } from '../daily/types';

function formatDateLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function toTeaserEntry(
  e: LeaderboardResponse['rankings']['points'][number],
): LeaderboardTeaserEntry {
  return { rank: e.rank, name: e.displayName, score: e.value };
}

export function DailyResultsRoute() {
  const { dailyInfo, setDailyInfo, cancelGame, game, results, cachedDailyResult } = useGame();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromSource = searchParams.get('from');

  // Date resolution: URL ?date takes precedence (enables the date
  // picker to drive historical navigation). Falls back to dailyInfo
  // for the common landing/game-end/leaderboard-self entry flows.
  const urlDate = searchParams.get('date');
  const targetDate = urlDate ?? dailyInfo?.date ?? null;

  const [serverResult, setServerResult] = useState<DailyResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch guard keyed on date. Changing the date re-runs the fetch;
  // the transient null after handleClose's setDailyInfo(null) doesn't
  // re-trigger the redirect branch because we've already loaded once.
  const fetchedForRef = useRef<string | null>(null);

  // Only trust the in-memory game results when they match the target
  // date's board — otherwise the user is viewing a historical daily
  // and must be served from the server.
  const liveDailyResults = useMemo(() => {
    if (!dailyInfo || !results) return null;
    if (targetDate && targetDate !== dailyInfo.date) return null;
    const live = results.board.flat().join(',');
    const expected = dailyInfo.board.flat().join(',');
    return live === expected ? results : null;
  }, [dailyInfo, results, targetDate]);

  useEffect(() => {
    if (!targetDate) {
      if (!fetchedForRef.current) navigate('/');
      return;
    }
    if (fetchedForRef.current === targetDate) return;
    fetchedForRef.current = targetDate;

    setLoading(true);
    setServerResult(null);

    const fetchResult = liveDailyResults
      ? Promise.resolve(null)
      : fetchDailyResult(targetDate);

    fetchResult
      .then((result) => {
        if (!liveDailyResults && !result) {
          navigate('/');
          return;
        }
        setServerResult(result);
        setLoading(false);
      })
      .catch(() => {
        navigate('/');
        setLoading(false);
      });
  }, [targetDate, liveDailyResults, navigate]);

  // Leaderboard fetch is decoupled from the result fetch. On a fresh daily
  // completion (liveDailyResults truthy) the server hasn't yet recorded
  // the player's row — firing `fetchLeaderboard` immediately would return
  // a teaser that omits the current user. Wait for GameContext to confirm
  // the server record via `cachedDailyResult` before fetching.
  useEffect(() => {
    if (!targetDate) return;
    if (liveDailyResults && !cachedDailyResult) return;
    fetchLeaderboard(targetDate)
      .then(setLeaderboard)
      .catch(() => setLeaderboard(null));
  }, [targetDate, liveDailyResults, cachedDailyResult]);

  // Stats for the picker entries — fetched once, independent of the
  // current target date.
  useEffect(() => {
    fetchDailyStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, []);

  const pickerEntries: DailyEntry[] = useMemo(() => {
    if (!stats) return [];
    return stats.days.map((d: DailyStatsDay) => ({
      puzzleNumber: d.puzzleNumber,
      date: new Date(d.date + 'T12:00:00'),
      state: d.state,
      points: d.points ?? undefined,
      wordsFound: d.wordsFound ?? undefined,
      longestWord: d.longestWord ?? undefined,
      longestWordDefinition: d.longestWordDefinition,
      stampTier: d.stampTier,
      playersCount: d.playersCount,
      config: d.config,
    }));
  }, [stats]);

  const handlePlayAgain = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  const handleClose = async () => {
    const backToLeaderboard = fromSource === 'leaderboard' && targetDate;
    const backTarget = backToLeaderboard
      ? `/leaderboard?date=${targetDate}`
      : '/';
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate(backTarget);
  };

  const handleOpenLeaderboard = () => {
    if (!targetDate) return;
    navigate(`/leaderboard?date=${targetDate}`);
  };

  const handleChangeDate = (iso: string) => {
    // Keep any existing `from` hint so the Close destination stays stable
    // across date changes, but swap out the date param.
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const daily: DailyResultsExtras | null = useMemo(() => {
    if (!targetDate) return null;
    const pointsRanking = leaderboard?.rankings.points ?? [];

    const TOP_WHEN_USER_IN_TOP = 3;
    const TOP_WHEN_USER_ABSENT = 2;
    const currentPlayerRank = leaderboard?.currentPlayer?.rank ?? null;
    const userInTop =
      currentPlayerRank !== null && currentPlayerRank <= TOP_WHEN_USER_IN_TOP;

    const top = pointsRanking
      .slice(0, userInTop ? TOP_WHEN_USER_IN_TOP : TOP_WHEN_USER_ABSENT)
      .map((e) => ({ ...toTeaserEntry(e), isCurrentUser: e.isCurrentUser }));

    const you: LeaderboardTeaserEntry | null =
      !userInTop && leaderboard?.currentPlayer
        ? {
            rank: leaderboard.currentPlayer.rank,
            name: 'you',
            score: leaderboard.currentPlayer.points,
            isCurrentUser: true,
          }
        : null;

    return {
      dateLabel: formatDateLabel(targetDate),
      leaderboardTop: top,
      leaderboardYou: you,
      onOpenLeaderboard: handleOpenLeaderboard,
      onChangeDate: () => {},
      pickerEntries,
      onPickerSelect: handleChangeDate,
      todayDate: getTodayPST(),
      selectedDate: targetDate,
    };
    // handleOpenLeaderboard / handleChangeDate close over stable navigate + setSearchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, leaderboard, pickerEntries]);

  if (loading || !targetDate || !daily) return null;

  const displayed = liveDailyResults ?? (serverResult
    ? {
        board: serverResult.board,
        foundWords: serverResult.found_words.map((word) => ({
          word,
          path: [],
          score: scoreWord(word),
        })),
        missedWords: (serverResult.missed_words ?? []).map((m) => ({
          word: m.word,
          path: m.path,
          score: m.score,
        })),
      }
    : null);

  if (!displayed) return null;

  return (
    <ResultsPage
      results={displayed}
      game={{
        board: displayed.board,
        startedAt: 0,
        status: GameState.Finished,
        config: {
          durationSeconds: serverResult?.config?.timeLimit ?? dailyInfo?.config.timeLimit ?? 120,
          boardSize: displayed.board.length,
          minWordLength: serverResult?.config?.minWordLength ?? dailyInfo?.config.minWordLength ?? 3,
        },
      }}
      gameSeed={dailyInfo?.seed}
      onClose={handleClose}
      onPlayAgain={handlePlayAgain}
      daily={daily}
    />
  );
}
