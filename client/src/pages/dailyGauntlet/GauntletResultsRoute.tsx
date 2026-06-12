import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { GauntletStatsDay, GauntletStatsResponse } from 'models/gauntlet';
import { useGame } from '../../GameContext';
import {
  fetchGauntletLeaderboard,
  fetchGauntletStats,
  fetchGauntletStatusForDate,
  type GauntletLeaderboardResponse,
  type GauntletStatusResponse,
} from '../../shared/api/gauntletApi';
import type { DailyEntry } from '../daily/types';
import { DateChip } from '../../shared/components/DateChip';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import { IconAction } from '../../shared/components/IconAction';
import { formatDateLabel } from '../../shared/utils/formatDate';
import { InkButton } from '../../shared/components/InkButton';
import {
  RankSumExplainer,
  RoundSummaryRow,
  StandingsLeaderboard,
} from './components';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

// Folds the gauntlet's three states onto the picker's completed/missed/
// unplayed display. Only fully-completed days are tappable (disableMissed),
// so a partial day reads the same as one that was never played.
function adaptDay(day: GauntletStatsDay, todayDate: string): DailyEntry {
  const state =
    day.state === 'completed'
      ? 'completed'
      : day.date === todayDate
        ? 'unplayed'
        : 'missed';
  return {
    puzzleNumber: day.puzzleNumber,
    date: new Date(day.date + 'T12:00:00'),
    iso: day.date,
    state,
    points: day.points ?? undefined,
    wordsFound: day.wordsFound ?? undefined,
    stampTier: null,
    playersCount: day.playersCount,
    config: { boardSize: 5, minWordLength: 4, timeLimit: 0 },
  };
}

// Aggregate end screen. Shows the player's per-round ranks, the rank-sum
// score, and how that placed them in the day's gauntlet field. Each round
// row is click-through to the per-round results so the player can compare
// words, see missed words, and re-read the modifier rule. The date chip
// opens a timeline picker for browsing past gauntlets.
export function GauntletResultsRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authReady } = useGame();
  const todayDate = getTodayPST();
  const targetDate = searchParams.get('date') ?? todayDate;

  const [status, setStatus] = useState<GauntletStatusResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<GauntletLeaderboardResponse | null>(null);
  const [stats, setStats] = useState<GauntletStatsResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoaded(false);
    setStatus(null);
    (async () => {
      const [s, lb] = await Promise.all([
        fetchGauntletStatusForDate(targetDate).catch(() => null),
        fetchGauntletLeaderboard(targetDate).catch(() => null),
      ]);
      if (cancelled) return;
      setStatus(s);
      setLeaderboard(lb);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, targetDate]);

  useEffect(() => {
    if (!authReady) return;
    fetchGauntletStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, [authReady]);

  const pickerEntries: DailyEntry[] = useMemo(
    () => stats?.days.map((d) => adaptDay(d, todayDate)) ?? [],
    [stats, todayDate],
  );

  const handleChangeDate = (iso: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const puzzleNumber =
    status?.puzzleNumber ??
    stats?.days.find((d) => d.date === targetDate)?.puzzleNumber ??
    0;
  const entry = status?.entry ?? null;
  const completed = entry?.state === 'completed';

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  return (
    <>
      <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
        <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px] gap-3">
          <header
            className="grid items-center gap-2 shrink-0"
            style={{ gridTemplateColumns: '32px 1fr 32px' }}
          >
            <IconAction onClick={() => navigate('/')} label="Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </IconAction>
            <div className="flex justify-center min-w-0">
              <DateChip
                label={`Gauntlet #${puzzleNumber} · ${formatDateLabel(targetDate)}`}
                onClick={() => setDatePickerOpen(true)}
              />
            </div>
            <span aria-hidden />
          </header>

          {completed && entry ? (
            <>
              <div className="text-center">
                <div
                  className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-2 font-[family-name:var(--font-structure)]"
                  style={{ fontWeight: 700 }}
                >
                  Standings
                </div>
                <div
                  className="text-display-sm italic leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-display)]"
                  style={{ fontWeight: 500 }}
                >
                  {entry.aggregateRank !== null ? `#${entry.aggregateRank}` : '—'}
                </div>
                <div className="mt-1 text-small text-[color:var(--ink-muted)]">
                  of {entry.totalPlayersCompleted.toLocaleString()} players · rank-sum{' '}
                  <span
                    className="font-[family-name:var(--font-structure)] text-[color:var(--ink)]"
                    style={{ fontWeight: 700 }}
                  >
                    {entry.aggregateRankSum ?? '—'}
                  </span>
                </div>
              </div>

              <RankSumExplainer />

              <div className="flex flex-col">
                {entry.rounds.map((summary, index) => (
                  <RoundSummaryRow
                    key={`agg-round-${index}`}
                    index={index}
                    summary={summary}
                    onView={() =>
                      navigate(
                        `/daily/gauntlet/round/${index}/results?from=standings&date=${targetDate}`,
                      )
                    }
                  />
                ))}
              </div>

              {leaderboard && leaderboard.aggregate.length > 0 && (
                <StandingsLeaderboard leaderboard={leaderboard} />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
              <p className="text-small text-[color:var(--ink-muted)]">
                {targetDate === todayDate
                  ? 'Finish all three rounds to see your gauntlet standings.'
                  : "You didn't finish this gauntlet. Pick another day to see its standings."}
              </p>
              {targetDate === todayDate && (
                <InkButton onClick={() => navigate('/daily/gauntlet')}>
                  Back to gauntlet
                </InkButton>
              )}
            </div>
          )}
        </div>
      </div>
      <DateTimelinePicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(iso) => {
          setDatePickerOpen(false);
          handleChangeDate(iso);
        }}
        entries={pickerEntries}
        selectedDate={targetDate}
        todayDate={todayDate}
        disableMissed
      />
    </>
  );
}
