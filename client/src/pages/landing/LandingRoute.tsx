import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { LandingPage } from './LandingPage';
import { fetchDaily, fetchDailyStats, type DailyStatsResponse } from '../../shared/api/gameApi';
import { scoreWord } from '../../shared/utils/score';
import { getLandingFixture } from './__fixtures__';
import type { DailyResults } from './types';

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
    cachedDailyZen,
    cachedDailyZenSession,
    dailyZenLoaded,
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

  const handleDailySeeResult = () => {
    // DailyResultsRoute reads the puzzle out of context; without it the
    // page redirects back home.
    if (cachedDaily) setDailyInfo(cachedDaily);
    navigate('/daily/results');
  };

  const handleDailyLeaderboard = () => {
    if (cachedDaily) {
      navigate(`/leaderboard?date=${cachedDaily.date}`);
    } else {
      navigate('/leaderboard');
    }
  };

  const handleZenPlay = () => navigate('/daily/zen/play');
  const handleZenResume = () => navigate('/daily/zen/play');
  const handleZenSeeResult = () => navigate('/daily/zen/results');
  const handleZenLeaderboard = () => {
    if (cachedDailyZen) {
      navigate(`/daily/zen/leaderboard?date=${cachedDailyZen.date}`);
    } else {
      navigate('/daily/zen/leaderboard');
    }
  };

  if (mockFixture) {
    return (
      <LandingPage
        dateLabel={mockFixture.dateLabel}
        streak={mockFixture.streak}
        dailyConfig={mockFixture.dailyConfig}
        zenConfig={mockFixture.zenConfig}
        dailyResults={mockFixture.dailyResults}
        zenSession={mockFixture.zenSession ?? null}
        displayName={mockFixture.displayName}
        onDisplayNameChange={() => {}}
        onDailyPlay={() => {}}
        onDailySeeResult={() => {}}
        onDailyLeaderboard={() => {}}
        onZenPlay={() => {}}
        onZenResume={() => {}}
        onZenSeeResult={() => {}}
        onZenLeaderboard={() => {}}
        onFreePlayClick={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (!cachedDaily || !cachedDailyZen || !dailyResultLoaded || !dailyZenLoaded) {
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

  return (
    <LandingPage
      dateLabel={formatToday(cachedDaily.date)}
      streak={stats?.currentStreak ?? 0}
      dailyConfig={cachedDaily.config}
      zenConfig={cachedDailyZen.config}
      dailyResults={dailyResultsData}
      zenSession={cachedDailyZenSession}
      displayName={displayName}
      onDisplayNameChange={updateDisplayName}
      onDailyPlay={handleDailyPlay}
      onDailySeeResult={handleDailySeeResult}
      onDailyLeaderboard={handleDailyLeaderboard}
      onZenPlay={handleZenPlay}
      onZenResume={handleZenResume}
      onZenSeeResult={handleZenSeeResult}
      onZenLeaderboard={handleZenLeaderboard}
      onFreePlayClick={handleFreePlay}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
