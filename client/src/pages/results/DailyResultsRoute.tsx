import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import {
  fetchDailyResult,
  fetchLeaderboard,
  type DailyResultResponse,
  type LeaderboardResponse,
} from '../../shared/api/gameApi';
import { scoreWord } from '../../shared/utils/score';
import { ResultsPage, type DailyResultsExtras } from './ResultsPage';
import type { LeaderboardTeaserEntry } from './components/LeaderboardTeaser';

function formatDateLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function toTeaserEntry(
  e: LeaderboardResponse['rankings']['points'][number],
): LeaderboardTeaserEntry {
  return { rank: e.rank, name: e.displayName, score: e.value };
}

export function DailyResultsRoute() {
  const { dailyInfo, setDailyInfo, cancelGame, game, results } = useGame();
  const navigate = useNavigate();
  const [serverResult, setServerResult] = useState<DailyResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // When the user has just finished the daily in this session, the live
  // `results` from GameContext already carry the full found+missed set
  // with real paths, and the server write is still in flight. Prefer the
  // in-memory data in that case so we don't race the upload and bounce
  // the user to / when the fetch sees no row yet.
  const liveDailyResults = useMemo(() => {
    if (!dailyInfo || !results) return null;
    const live = results.board.flat().join(',');
    const expected = dailyInfo.board.flat().join(',');
    return live === expected ? results : null;
  }, [dailyInfo, results]);

  useEffect(() => {
    if (!dailyInfo || fetchedRef.current) {
      if (!dailyInfo) navigate('/');
      return;
    }
    fetchedRef.current = true;

    const date = dailyInfo.date;

    // Still fetch the leaderboard even in the just-completed case, but
    // skip the result fetch: the live results from context are authoritative.
    if (liveDailyResults) {
      fetchLeaderboard(date)
        .catch(() => null)
        .then((lb) => {
          setLeaderboard(lb);
          setLoading(false);
        });
      return;
    }

    Promise.all([
      fetchDailyResult(date),
      fetchLeaderboard(date).catch(() => null),
    ])
      .then(([result, lb]) => {
        if (!result) {
          navigate('/');
          return;
        }
        setServerResult(result);
        setLeaderboard(lb);
        setLoading(false);
      })
      .catch(() => {
        navigate('/');
        setLoading(false);
      });
  }, [dailyInfo, navigate, liveDailyResults]);

  const handlePlayAgain = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  const handleClose = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  const handleOpenLeaderboard = () => {
    if (!dailyInfo) return;
    navigate(`/leaderboard?date=${dailyInfo.date}`);
  };

  const daily: DailyResultsExtras | null = useMemo(() => {
    if (!dailyInfo) return null;
    const top = (leaderboard?.rankings.points ?? []).slice(0, 2).map(toTeaserEntry);
    const you: LeaderboardTeaserEntry | null = leaderboard?.currentPlayer
      ? {
          rank: leaderboard.currentPlayer.rank,
          name: 'you',
          score: leaderboard.currentPlayer.points,
        }
      : null;
    return {
      dateLabel: formatDateLabel(dailyInfo.date),
      leaderboardTop: top,
      leaderboardYou: you,
      onOpenLeaderboard: handleOpenLeaderboard,
    };
    // handleOpenLeaderboard closes over navigate+dailyInfo, both stable
    // within a given render of this route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyInfo, leaderboard]);

  if (loading || !dailyInfo || !daily) return null;

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
          durationSeconds: dailyInfo.config.timeLimit,
          boardSize: dailyInfo.config.boardSize,
          minWordLength: dailyInfo.config.minWordLength,
        },
      }}
      gameSeed={dailyInfo.seed}
      onClose={handleClose}
      onPlayAgain={handlePlayAgain}
      daily={daily}
    />
  );
}
