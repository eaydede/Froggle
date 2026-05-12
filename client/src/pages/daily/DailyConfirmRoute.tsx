import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { DailyConfirmPage } from './DailyConfirmPage';
import { fetchDailyStats, startDailyAttemptOnServer } from '../../shared/api/gameApi';

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

interface DailyConfirmFixture {
  dateLabel: string;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  playersCount: number | null;
  alreadyPlayed?: boolean;
}

const FIXTURES: Record<string, DailyConfirmFixture> = {
  default: {
    dateLabel: 'Tuesday · April 21',
    boardSize: 5,
    timeLimit: 120,
    minWordLength: 3,
    playersCount: 1247,
  },
  played: {
    dateLabel: 'Tuesday · April 21',
    boardSize: 5,
    timeLimit: 120,
    minWordLength: 3,
    playersCount: 1247,
    alreadyPlayed: true,
  },
};

export function DailyConfirmRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cachedDaily,
    cachedDailyResult,
    dailyResultLoaded,
    authReady,
    startGame,
    cancelGame,
    game,
    dailyInfo,
    setDailyInfo,
    abandonDaily,
  } = useGame();
  const [playersCount, setPlayersCount] = useState<number | null>(null);

  // Dev-only fixture injection — `?mock=default` renders canned copy so the
  // page can be reached without a live daily puzzle loaded. Stripped from
  // production bundles.
  const mockFixture = import.meta.env.DEV
    ? FIXTURES[searchParams.get('mock') ?? '']
    : undefined;

  useEffect(() => {
    if (mockFixture || !authReady) return;
    let cancelled = false;
    fetchDailyStats({ definitions: false })
      .then((stats) => {
        if (cancelled) return;
        const today = stats.days[stats.days.length - 1];
        setPlayersCount(today?.playersCount ?? null);
      })
      .catch(() => {
        // Non-fatal — the count line renders as a spacer when null.
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, mockFixture]);

  // Re-entering /daily while a daily game is still in progress (browser
  // back from /game, history nav, etc.) is treated the same as a Froggle-
  // title cancel: finalize the attempt with whatever was found so far and
  // tear down the server session. Without this, the confirm page would
  // still see cachedDailyResult=null and re-offer Start.
  //
  // The ref keeps the effect from firing during handleStart's own state
  // changes — startGame flips game.status to InProgress before navigate
  // unmounts us, which would otherwise trip the same condition.
  const startingRef = useRef(false);
  useEffect(() => {
    if (mockFixture || startingRef.current) return;
    if (!dailyInfo) return;
    if (cachedDailyResult) return;
    if (game?.status !== GameState.InProgress) return;
    let cancelled = false;
    (async () => {
      await abandonDaily();
      if (cancelled) return;
      await cancelGame();
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mockFixture, dailyInfo, cachedDailyResult, game?.status, abandonDaily, cancelGame]);

  const handleBack = () => {
    setDailyInfo(null);
    navigate('/');
  };

  const handleStart = async () => {
    if (mockFixture || !cachedDaily) return;
    // Safety net — the UI already swaps Start for See result in the
    // already-played state, but a mis-click/keyboard path shouldn't
    // create a second attempt.
    if (cachedDailyResult) {
      setDailyInfo(cachedDaily);
      navigate('/daily/results');
      return;
    }
    startingRef.current = true;
    setDailyInfo(cachedDaily);
    // Best-effort: write an empty daily_results row before the game starts
    // so closing the tab mid-play still leaves an attempt on the server.
    // Non-fatal — if this fails the only regression is the original
    // tab-close replay bug, which we don't want to gate the game on.
    try {
      await startDailyAttemptOnServer(
        cachedDaily.date,
        cachedDaily.board,
        cachedDaily.config,
      );
    } catch (err) {
      console.warn('Failed to mark daily attempt as started:', err);
    }
    await startGame(
      cachedDaily.config.timeLimit,
      cachedDaily.config.boardSize,
      cachedDaily.config.minWordLength,
      undefined,
      cachedDaily.seed,
    );
    navigate('/game');
  };

  const handleSeeResult = () => {
    if (!cachedDaily) return;
    setDailyInfo(cachedDaily);
    navigate('/daily/results');
  };

  if (mockFixture) {
    return (
      <DailyConfirmPage
        dateLabel={mockFixture.dateLabel}
        boardSize={mockFixture.boardSize}
        timeLimit={mockFixture.timeLimit}
        minWordLength={mockFixture.minWordLength}
        playersCount={mockFixture.playersCount}
        onStart={() => {}}
        onBack={handleBack}
        alreadyPlayed={mockFixture.alreadyPlayed}
        onSeeResult={() => {}}
      />
    );
  }

  // Wait for both the daily payload and the "has the user already played"
  // lookup to settle before rendering. Otherwise we'd briefly flash the
  // Start button for a user who has already played, then swap it to See
  // result once the cache fills in.
  if (!cachedDaily || !dailyResultLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  return (
    <DailyConfirmPage
      dateLabel={formatLongDate(cachedDaily.date)}
      boardSize={cachedDaily.config.boardSize}
      timeLimit={cachedDaily.config.timeLimit}
      minWordLength={cachedDaily.config.minWordLength}
      playersCount={playersCount}
      onStart={handleStart}
      onBack={handleBack}
      alreadyPlayed={cachedDailyResult !== null}
      onSeeResult={handleSeeResult}
    />
  );
}
