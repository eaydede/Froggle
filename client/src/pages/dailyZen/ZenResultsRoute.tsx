import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ResultsView } from '../../shared/results/ResultsView';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
} from '../../shared/results/types';
import { HeroScore } from '../results/components/HeroScore';
import { IconAction } from '../../shared/components/IconAction';
import { DateChip } from '../../shared/components/DateChip';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import { ActionButton } from '../../shared/results/components/ActionButton';

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
  const initialOpponentId = searchParams.get('compare');
  const targetDate = urlDate ?? cachedDailyZen?.date ?? null;

  const [result, setResult] = useState<DailyZenResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyZenLeaderboardResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<DailyZenStatsResponse | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
      ? generateShareText(result.found_words, { daily: { number: puzzleNumber, mode: 'zen' } })
      : '',
  );

  const totalPoints = useMemo(
    () => (result ? result.found_words.reduce((sum, w) => sum + w.score, 0) : 0),
    [result],
  );

  const currentUserId = session?.user?.id;
  const roster: ResultsRosterEntry[] = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.rankings.points.map((e) => ({
      id: e.userId,
      rank: e.rank,
      displayName: e.displayName,
      points: e.points,
      isYou: e.userId === currentUserId,
    }));
  }, [leaderboard, currentUserId]);

  const loadOpponent = useMemo(
    () =>
      async (userId: string): Promise<LoadOpponentResult> => {
        if (!targetDate) return { ok: false, error: 'unknown' };
        const r = await fetchDailyZenCompare(targetDate, userId);
        if (!r.ok) return { ok: false, error: r.error };
        return {
          ok: true,
          opponent: {
            id: userId,
            displayName: r.data.them.displayName,
            points: r.data.them.points,
            wordCount: r.data.them.wordCount,
            foundWords: r.data.them.foundWords,
          },
        };
      },
    [targetDate],
  );

  if (!loaded || !targetDate) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  const dateLabel = `Zen Daily · ${formatDateLabel(targetDate)}`;
  const onClose = () => {
    if (fromSource === 'leaderboard' && targetDate) {
      navigate(`/daily/zen/leaderboard?date=${targetDate}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <ResultsView
        me={{
          displayName: 'You',
          points: totalPoints,
          wordCount: result.found_words.length,
          foundWords: result.found_words,
          missedWords: result.missed_words,
        }}
        board={result.board}
        config={{
          boardSize: result.board.length,
          minWordLength: cachedDailyZen?.config.minWordLength ?? 4,
          timeLimit: 0,
        }}
        roster={roster}
        loadOpponent={loadOpponent}
        initialOpponentId={initialOpponentId}
        standingsHeader="Leaderboard"
        compareSourceLabel="leaderboard"
        findPercents={result.find_percents}
        popularityStyle={result.find_percents ? 'inline' : undefined}
        soloPlaceholderVariant="wait"
        soloHero={
          <div className="shrink-0 pt-2 pb-1 h-[82px] box-border flex items-center justify-center">
            <HeroScore
              points={totalPoints}
              words={result.found_words.length}
              primary="points"
              accessory={<ZenModeBadge isCompetitive={result.is_competitive} />}
            />
          </div>
        }
        topbar={
          <ZenTopbar
            label={dateLabel}
            onClose={onClose}
            onShare={share}
            shareCopied={copied}
            onLabelClick={() => setDatePickerOpen(true)}
          />
        }
        bottomActions={
          <ZenBottomActions
            onHome={() => navigate('/')}
            onLeaderboard={() => navigate(`/daily/zen/leaderboard?date=${targetDate}`)}
          />
        }
      />
      <DateTimelinePicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(iso) => {
          setDatePickerOpen(false);
          handleChangeDate(iso);
        }}
        entries={pickerEntries}
        selectedDate={targetDate}
        todayDate={getTodayPST()}
        disableMissed
        onShare={share}
      />
    </>
  );
}

function ZenTopbar({
  label,
  onClose,
  onShare,
  shareCopied,
  onLabelClick,
}: {
  label: string;
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
  onLabelClick?: () => void;
}) {
  return (
    <header
      className="grid items-center gap-2 shrink-0"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div className="flex justify-center min-w-0">
        <DateChip label={label} onClick={onLabelClick} />
      </div>
      <IconAction onClick={onShare} label={shareCopied ? 'Copied to clipboard' : 'Share'}>
        {shareCopied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </IconAction>
    </header>
  );
}

function ZenBottomActions({
  onHome,
  onLeaderboard,
}: {
  onHome: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        onClick={onHome}
        label="Home"
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M9 20v-6h6v6" />
          </svg>
        }
      />
      <ActionButton
        onClick={onLeaderboard}
        label="Leaderboard"
        primary
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10" />
            <path d="M10 20V4" />
            <path d="M16 20v-7" />
            <path d="M22 20H2" />
          </svg>
        }
      />
    </div>
  );
}
