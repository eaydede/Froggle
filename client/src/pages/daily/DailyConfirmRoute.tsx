import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { DailyConfirmPage } from './DailyConfirmPage';
import { fetchDailyStats } from '../../shared/api/gameApi';

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
    createGame,
    startGame,
    game,
    setDailyInfo,
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
    fetchDailyStats()
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
    setDailyInfo(cachedDaily);
    if (!game) await createGame();
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
