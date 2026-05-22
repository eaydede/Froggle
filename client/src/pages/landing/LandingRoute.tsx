import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { LandingPage } from './LandingPage';
import {
  fetchDaily,
  fetchDailyStats,
  fetchLeaderboard,
  fetchDailyZenLeaderboard,
  fetchFreePlayUnread,
  type DailyStatsResponse,
} from '../../shared/api/gameApi';
import { fetchGauntletStatus } from '../../shared/api/gauntletApi';
import type { GauntletEntry } from 'models/gauntlet';
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
    nameProfile,
    updateDisplayName,
    theme,
    toggleTheme,
  } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [dailyRank, setDailyRank] = useState<number | null>(null);
  const [zenRank, setZenRank] = useState<number | null>(null);
  const [freePlayUnread, setFreePlayUnread] = useState(0);
  const [gauntletEntry, setGauntletEntry] = useState<GauntletEntry | null>(null);

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
    fetchFreePlayUnread()
      .then(({ count }) => {
        if (!cancelled) setFreePlayUnread(count);
      })
      .catch(() => {
        // Non-fatal: the dot just doesn't render.
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchGauntletStatus()
      .then((s) => {
        if (!cancelled) setGauntletEntry(s.entry);
      })
      .catch(() => {
        // Non-fatal: gauntlet card falls back to the "unplayed" hint.
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchDailyStats({ definitions: false })
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

  // Fetch the player's rank for podium-badge display. Only when the player
  // has actually finished today's puzzle — otherwise rank isn't meaningful
  // (and for in-progress zen, it would shift through the day). Failures are
  // non-fatal: the badge just doesn't render.
  useEffect(() => {
    if (!authReady || !cachedDaily || !cachedDailyResult) return;
    let cancelled = false;
    fetchLeaderboard(cachedDaily.date)
      .then((lb) => {
        if (!cancelled) setDailyRank(lb.currentPlayer?.rank ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authReady, cachedDaily, cachedDailyResult]);

  // Fetch zen rank for completed competitive sessions. In-progress players
  // do not have a stable rank yet, and refetching on every found word creates
  // avoidable leaderboard traffic from the landing page.
  useEffect(() => {
    if (!authReady || !cachedDailyZen || !cachedDailyZenSession) return;
    if (!cachedDailyZenSession.is_competitive || !cachedDailyZenSession.ended_at) {
      setZenRank(null);
      return;
    }
    let cancelled = false;
    fetchDailyZenLeaderboard(cachedDailyZen.date)
      .then((lb) => {
        if (!cancelled) setZenRank(lb.currentPlayer?.rank ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authReady, cachedDailyZen?.date, cachedDailyZenSession?.date, cachedDailyZenSession?.ended_at, cachedDailyZenSession?.is_competitive]);

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

  const handleGauntletPlay = () => navigate('/daily/gauntlet');

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
        dailyResults={mockFixture.dailyResults}
        dailyRank={null}
        zenSession={mockFixture.zenSession ?? null}
        zenRank={null}
        gauntletEntry={null}
        onGauntletPlay={() => {}}
        displayName={mockFixture.displayName}
        nameProfile={null}
        onDisplayNameChange={async () => ({ ok: true as const, profile: {
          display_name: mockFixture.displayName,
          public_name: mockFixture.displayName,
          is_marked: false,
          is_locked: false,
          locked_until: null,
          mask_name: mockFixture.displayName,
          strikes: 0,
        } })}
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
      dailyResults={dailyResultsData}
      dailyRank={dailyRank}
      zenSession={cachedDailyZenSession}
      zenRank={zenRank}
      gauntletEntry={gauntletEntry}
      onGauntletPlay={handleGauntletPlay}
      displayName={displayName}
      nameProfile={nameProfile}
      onDisplayNameChange={updateDisplayName}
      onDailyPlay={handleDailyPlay}
      onDailySeeResult={handleDailySeeResult}
      onDailyLeaderboard={handleDailyLeaderboard}
      onZenPlay={handleZenPlay}
      onZenResume={handleZenResume}
      onZenSeeResult={handleZenSeeResult}
      onZenLeaderboard={handleZenLeaderboard}
      onFreePlayClick={handleFreePlay}
      onFreePlayHistory={() => navigate('/history')}
      freePlayUnread={freePlayUnread}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
