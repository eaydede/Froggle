import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchDailyZenLeaderboard,
  fetchDailyZenStats,
  type DailyStatsDay,
  type DailyZenLeaderboardResponse,
  type DailyZenStatsResponse,
} from '../../shared/api/gameApi';
import { IconAction } from '../../shared/components/IconAction';
import { DateChip } from '../../shared/components/DateChip';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import { InlineStats } from '../leaderboard/components/InlineStats';
import { LeaderboardList, type LbListEntry } from '../leaderboard/components/LeaderboardList';
import type { DailyEntry } from '../daily/types';
import { formatDateLabel } from '../../shared/utils/formatDate';

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

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function ZenLeaderboardRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authReady, session } = useGame();
  const date = searchParams.get('date') ?? getTodayPST();
  const [data, setData] = useState<DailyZenLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DailyZenStatsResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    fetchDailyZenLeaderboard(date)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, date]);

  useEffect(() => {
    if (!authReady) return;
    fetchDailyZenStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, [authReady]);

  const pickerEntries: DailyEntry[] = useMemo(() => {
    return stats?.days.map(adaptDay) ?? [];
  }, [stats]);

  const handleChangeDate = (iso: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const currentUserId = session?.user?.id;

  const entries: LbListEntry[] = useMemo(() => {
    if (!data) return [];
    // Zen leaderboard is ranked by words found rather than points — the
    // primary value players are chasing in the untimed mode is breadth, not
    // score-per-minute.
    return data.rankings.words.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      displayName: e.displayName,
      subLabel: `${e.points} ${e.points === 1 ? 'pt' : 'pts'}`,
      value: e.wordCount,
      valueUnit: e.wordCount === 1 ? 'word' : 'words',
      isCurrentUser: e.userId === currentUserId,
      inProgress: e.inProgress,
    }));
  }, [data, currentUserId]);

  // Mirror the timed leaderboard's "you" stat: top-percent when ≤30%,
  // otherwise the absolute rank as a fallback so the user always knows
  // where they stand at a glance.
  const youStats = useMemo(() => {
    if (!data?.currentPlayer) return { topPercent: undefined as number | undefined | null, fallback: undefined as string | undefined };
    const { rank, totalPlayers } = data.currentPlayer;
    if (totalPlayers <= 0) return { topPercent: null, fallback: undefined };
    const pct = Math.ceil((rank / totalPlayers) * 100);
    if (pct <= 30) return { topPercent: pct, fallback: undefined };
    return { topPercent: null, fallback: `#${rank}` };
  }, [data]);

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="relative w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <div
          className="grid items-center gap-2.5 pt-3.5 shrink-0"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <IconAction label="Back" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </IconAction>
          <div
            className="text-center italic text-[16px] tracking-[-0.01em] text-[color:var(--ink)] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 600 }}
          >
            Zen Leaderboard
          </div>
          <div aria-hidden />
        </div>

        <div className="flex justify-center mt-2.5">
          <DateChip label={formatDateLabel(date)} onClick={() => setPickerOpen(true)} />
        </div>

        {loading && (
          <div
            className="text-small text-[color:var(--ink-soft)] text-center mt-6"
            style={{ fontWeight: 500 }}
          >
            Loading…
          </div>
        )}

        {!loading && data && data.totalPlayers === 0 && (
          <div
            className="text-small text-[color:var(--ink-muted)] text-center mt-6 leading-relaxed"
            style={{ fontWeight: 500 }}
          >
            No one has started today's zen puzzle yet.
            <br />
            Be the first.
          </div>
        )}

        {!loading && data && data.totalPlayers > 0 && (
          <>
            <InlineStats
              totalPlayers={data.totalPlayers}
              avgScore={data.avgScore}
              youTopPercent={youStats.topPercent}
              youFallback={youStats.fallback}
            />
            <LeaderboardList entries={entries} />
          </>
        )}
      </div>

      <DateTimelinePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(iso) => {
          setPickerOpen(false);
          handleChangeDate(iso);
        }}
        entries={pickerEntries}
        selectedDate={date}
        todayDate={getTodayPST()}
      />
    </div>
  );
}
