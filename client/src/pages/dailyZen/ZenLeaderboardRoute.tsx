import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchDailyZenLeaderboard,
  fetchDailyZenStats,
  type DailyStatsDay,
  type DailyZenLeaderboardInProgressEntry,
  type DailyZenLeaderboardResponse,
  type DailyZenStatsResponse,
} from '../../shared/api/gameApi';
import { IconAction } from '../../shared/components/IconAction';
import { StatusIcon } from '../../shared/components/StatusIcon';
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
    // score-per-minute. Server already filters to completed competitive
    // rows; in-progress players surface in the presence section instead.
    return data.rankings.words.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      displayName: e.displayName,
      subLabel: `${e.points} ${e.points === 1 ? 'pt' : 'pts'}`,
      value: e.wordCount,
      valueUnit: e.wordCount === 1 ? 'word' : 'words',
      isCurrentUser: e.userId === currentUserId,
    }));
  }, [data, currentUserId]);

  // Mirror the timed leaderboard's "you" stat: top-percent when ≤30%,
  // otherwise the absolute rank as a fallback. Suppressed for casual and
  // competitive-in-progress players, who don't yet have a meaningful rank.
  const youStats = useMemo(() => {
    const empty = { topPercent: undefined as number | undefined | null, fallback: undefined as string | undefined };
    if (!data?.currentPlayer || !data.currentPlayer.ranked || data.currentPlayer.rank == null) {
      return empty;
    }
    const { rank, totalRankedPlayers } = data.currentPlayer;
    if (totalRankedPlayers <= 0) return { topPercent: null, fallback: undefined };
    const pct = Math.ceil((rank / totalRankedPlayers) * 100);
    if (pct <= 30) return { topPercent: pct, fallback: undefined };
    return { topPercent: null, fallback: `#${rank}` };
  }, [data]);

  const currentPlayerNote = useMemo(() => {
    const cp = data?.currentPlayer;
    if (!cp) return null;
    if (!cp.isCompetitive) {
      return "You're playing casually today — casual scores aren't ranked.";
    }
    if (!cp.ranked) {
      return 'Your rank will appear once you finish the puzzle.';
    }
    return null;
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
            {currentPlayerNote && (
              <div
                className="mt-2 px-3 py-2 rounded-lg bg-[var(--ink-whisper)] text-caption text-[color:var(--ink-muted)] text-center leading-[1.4]"
                style={{ fontWeight: 500 }}
              >
                {currentPlayerNote}
              </div>
            )}
            {data.inProgressPlayers.length > 0 && (
              <InProgressPresence players={data.inProgressPlayers} />
            )}
            {entries.length > 0 ? (
              <LeaderboardList entries={entries} />
            ) : (
              <div
                className="mt-3 text-small text-[color:var(--ink-muted)] text-center leading-relaxed"
                style={{ fontWeight: 500 }}
              >
                No one has finished today's zen puzzle yet.
              </div>
            )}
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

// Score-less presence list shown above the ranked entries. Hides any
// mid-session score from view so finishing the puzzle remains the only way
// to put a number on the board.
function InProgressPresence({ players }: { players: DailyZenLeaderboardInProgressEntry[] }) {
  const label = players.length === 1 ? '1 player solving' : `${players.length} players solving`;
  return (
    <div className="mt-3 rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div
        className="flex items-center gap-1.5 px-3 py-[9px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] leading-none font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        <StatusIcon state="in-progress" />
        <span className="tabular-nums">{label}</span>
      </div>
      <div className="max-h-[140px] overflow-y-auto [scrollbar-width:thin]">
        {players.map((p, i) => (
          <div
            key={p.userId}
            className={[
              'flex items-center justify-between px-3.5 py-2 text-[13px] text-[color:var(--ink)]',
              i === 0 ? '' : 'border-t border-[var(--ink-border-subtle)]',
            ].join(' ')}
            style={{ fontWeight: 500 }}
          >
            <span className="truncate">{p.displayName}</span>
            <span
              className="text-caption text-[color:var(--ink-soft)] uppercase tracking-[0.08em] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 600 }}
            >
              still solving
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
