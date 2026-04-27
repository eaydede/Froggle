import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchDailyRelaxedLeaderboard,
  type DailyRelaxedLeaderboardResponse,
} from '../../shared/api/gameApi';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function formatDateLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

export function RelaxedLeaderboardRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authReady, session } = useGame();
  const date = searchParams.get('date') ?? getTodayPST();
  const [data, setData] = useState<DailyRelaxedLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    fetchDailyRelaxedLeaderboard(date)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authReady, date]);

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[420px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] bg-transparent border-none cursor-pointer py-1.5 mb-3 font-[family-name:var(--font-ui)] flex items-center gap-1.5"
          style={{ fontWeight: 500 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div className="text-center mb-5">
          <div
            className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] mb-2 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Daily Relaxed{data ? ` #${data.puzzleNumber}` : ''}
          </div>
          <div
            className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 500 }}
          >
            Leaderboard
          </div>
          <div
            className="text-small text-[color:var(--ink-muted)] mt-1"
            style={{ fontWeight: 500 }}
          >
            {formatDateLabel(date)}
          </div>
        </div>

        {loading && (
          <div className="text-small text-[color:var(--ink-soft)] text-center" style={{ fontWeight: 500 }}>
            Loading…
          </div>
        )}

        {!loading && data && data.totalPlayers === 0 && (
          <div className="text-small text-[color:var(--ink-muted)] text-center mt-4 leading-relaxed" style={{ fontWeight: 500 }}>
            No one has finished today's relaxed puzzle yet.
            <br />
            Be the first.
          </div>
        )}

        {!loading && data && data.totalPlayers > 0 && (
          <>
            <Summary
              totalPlayers={data.totalPlayers}
              avgScore={data.avgScore}
            />
            <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden mt-4">
              {data.rankings.points.map((entry) => (
                <Row
                  key={entry.userId}
                  rank={entry.rank}
                  displayName={entry.displayName}
                  points={entry.points}
                  wordCount={entry.wordCount}
                  isCurrent={entry.userId === session?.user?.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Summary({ totalPlayers, avgScore }: { totalPlayers: number; avgScore: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Players" value={totalPlayers.toLocaleString()} />
      <Stat label="Avg score" value={avgScore.toLocaleString()} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] py-3 text-center">
      <div
        className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-soft)] leading-none mb-1.5 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {label}
      </div>
      <div className="text-xl tabular-nums tracking-[-0.01em]" style={{ fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function Row({
  rank,
  displayName,
  points,
  wordCount,
  isCurrent,
}: {
  rank: number;
  displayName: string;
  points: number;
  wordCount: number;
  isCurrent: boolean;
}) {
  return (
    <div
      className={
        'grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-2.5 border-b border-[var(--ink-border-subtle)] last:border-b-0' +
        (isCurrent ? ' bg-[var(--ink-whisper)]' : '')
      }
    >
      <div
        className="text-small tabular-nums text-[color:var(--ink-soft)]"
        style={{ fontWeight: 700 }}
      >
        #{rank}
      </div>
      <div className="text-small truncate" style={{ fontWeight: 600 }}>
        {displayName}
        {isCurrent && (
          <span className="text-caption ml-2 text-[color:var(--ink-soft)]" style={{ fontWeight: 600 }}>
            you
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="text-base" style={{ fontWeight: 700 }}>
          {points}
        </span>
        <span className="text-caption text-[color:var(--ink-soft)]" style={{ fontWeight: 500 }}>
          {wordCount}w
        </span>
      </div>
    </div>
  );
}
