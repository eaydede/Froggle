import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { LandingPage } from './LandingPage';
import { fetchDaily, fetchDailyStats, type DailyStatsResponse } from '../../shared/api/gameApi';
import { scoreWord } from '../../shared/utils/score';
import { getLandingFixture } from './__fixtures__';
import type { DailyResults } from './types';

const STREAK_WINDOW = 10;

function formatToday(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'short' });
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function LandingRoute() {
  const {
    cachedDaily,
    cachedDailyResult,
    dailyResultLoaded,
    authReady,
    createGame,
    setDailyInfo,
    displayName,
    updateDisplayName,
    theme,
    toggleTheme,
  } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);

  // Dev-only fixture injection — `?mock=unplayed|completed|partial` renders
  // the page with canned data so visual-regression work can reach either
  // state without needing a live account or completed game. Stripped from
  // production bundles.
  const mockFixture = import.meta.env.DEV
    ? getLandingFixture(searchParams.get('mock'))
    : null;

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchDailyStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        // Non-fatal: landing still renders with zeroed streak.
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const handleFreePlay = async () => {
    setDailyInfo(null);
    await createGame();
    navigate('/play');
  };

  const handleDailyPlay = async () => {
    const info = await fetchDaily();
    setDailyInfo(info);
    navigate('/daily');
  };

  const handleDailySeeResult = () => navigate('/daily/results');

  const handleDailyLeaderboard = () => {
    if (cachedDaily) {
      navigate(`/leaderboard?date=${cachedDaily.date}`);
    } else {
      navigate('/leaderboard');
    }
  };

  const handleCalendar = () => navigate('/daily');

  if (mockFixture) {
    return (
      <LandingPage
        dateLabel={mockFixture.dateLabel}
        streak={mockFixture.streak}
        streakDays={mockFixture.streakDays}
        dailyResults={mockFixture.dailyResults}
        displayName={mockFixture.displayName}
        onDisplayNameChange={() => {}}
        onCalendarClick={() => {}}
        onDailyPlay={() => {}}
        onDailySeeResult={() => {}}
        onDailyLeaderboard={() => {}}
        onFreePlayClick={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (!cachedDaily || !dailyResultLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
        <div
          className="text-logo italic leading-none tracking-[-0.02em] font-[family-name:var(--font-display)]"
          style={{ fontWeight: 600 }}
        >
          Froggle
          <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
        </div>
      </div>
    );
  }

  let dailyResultsData: DailyResults | null = null;
  if (cachedDailyResult) {
    const words = cachedDailyResult.found_words;
    const longest = words.reduce((best, w) => (w.length > best.length ? w : best), '');
    const totalScore = words.reduce((sum, w) => sum + scoreWord(w), 0);
    dailyResultsData = {
      words: words.length,
      points: totalScore,
      longestWord: longest,
    };
  }

  const streakDays = buildStreakDays(stats, !!cachedDailyResult);

  return (
    <LandingPage
      dateLabel={formatToday(cachedDaily.date)}
      streak={stats?.currentStreak ?? 0}
      streakDays={streakDays}
      dailyResults={dailyResultsData}
      displayName={displayName}
      onDisplayNameChange={updateDisplayName}
      onCalendarClick={handleCalendar}
      onDailyPlay={handleDailyPlay}
      onDailySeeResult={handleDailySeeResult}
      onDailyLeaderboard={handleDailyLeaderboard}
      onFreePlayClick={handleFreePlay}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

/**
 * Builds the STREAK_WINDOW-length array the StreakBar renders. Padded with
 * `false` when the server window is shorter (new users, shortly after launch),
 * and the last slot is forced to reflect the user's *current-session* play
 * state — the server response predates a fresh submission by up to a request.
 */
function buildStreakDays(
  stats: DailyStatsResponse | null,
  playedToday: boolean,
): boolean[] {
  const base = stats?.days ?? [];
  const window = base.slice(-STREAK_WINDOW).map((d) => d.state === 'completed');
  const padding = Array<boolean>(Math.max(0, STREAK_WINDOW - window.length)).fill(false);
  const result = [...padding, ...window];
  if (result.length > 0) result[result.length - 1] = playedToday;
  return result;
}
