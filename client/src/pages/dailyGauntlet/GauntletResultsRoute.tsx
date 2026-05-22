import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAUNTLET_ROUND_COUNT, type GauntletRoundSummary } from 'models/gauntlet';
import { useGame } from '../../GameContext';
import {
  fetchGauntletLeaderboard,
  fetchGauntletStatus,
  type GauntletLeaderboardResponse,
  type GauntletStatusResponse,
} from '../../shared/api/gauntletApi';
import { InkButton } from '../../shared/components/InkButton';
import { RankBadge, type PodiumRank } from '../landing/components/RankBadge';
import { roundTitle } from './modifierDisplay';

function podiumOf(rank: number | null | undefined): PodiumRank | null {
  if (rank === 1 || rank === 2 || rank === 3) return rank;
  return null;
}

// Maps a top-3 rank to its podium color. Used to tint the rank number in
// the full standings table so the medal hierarchy is baked into the
// number itself — no separate medal column nudging the name column.
function podiumColor(rank: PodiumRank | null): string {
  switch (rank) {
    case 1: return 'var(--podium-gold)';
    case 2: return 'var(--podium-silver)';
    case 3: return 'var(--podium-bronze)';
    case null:
    default: return 'var(--ink)';
  }
}

// Aggregate end screen. Shows the player's per-round ranks, the rank-sum
// score, and how that placed them in today's gauntlet field. Each round
// row is click-through to the per-round results so the player can compare
// words, see missed words, and re-read the modifier rule.
export function GauntletResultsRoute() {
  const navigate = useNavigate();
  const { authReady } = useGame();
  const [status, setStatus] = useState<GauntletStatusResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<GauntletLeaderboardResponse | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      const [s, lb] = await Promise.all([
        fetchGauntletStatus().catch(() => null),
        fetchGauntletLeaderboard(
          new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
        ).catch(() => null),
      ]);
      if (cancelled) return;
      if (s) setStatus(s);
      setLeaderboard(lb);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  if (!status) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const { entry } = status;
  if (entry.state !== 'completed') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] p-6 gap-4 text-center">
        <p className="text-small text-[color:var(--ink-muted)]">
          Finish all three rounds to see your gauntlet standings.
        </p>
        <InkButton onClick={() => navigate('/daily/gauntlet')}>Back to gauntlet</InkButton>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[420px] min-h-full flex flex-col px-[22px] pt-[12px] pb-[16px] gap-3">
        <div className="flex items-center pt-[6px]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
            style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
          >
            ← Home
          </button>
        </div>

        <div className="text-center">
          <div
            className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-2 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Gauntlet #{status.puzzleNumber} · Standings
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
            <RoundRow
              key={`agg-round-${index}`}
              index={index}
              summary={summary}
              onView={() =>
                navigate(`/daily/gauntlet/round/${index}/results?from=standings`)
              }
            />
          ))}
        </div>

        {leaderboard && leaderboard.aggregate.length > 0 && (
          <Leaderboard leaderboard={leaderboard} />
        )}
      </div>
    </div>
  );
}

function Leaderboard({ leaderboard }: { leaderboard: GauntletLeaderboardResponse }) {
  const meId = leaderboard.currentUserId;
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-[10px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        <span>Full standings</span>
        <span className="flex items-center gap-2 text-[color:var(--ink-faint)]">
          {Array.from({ length: GAUNTLET_ROUND_COUNT }, (_, i) => (
            <span key={`hdr-r${i}`} className="w-5 text-center">
              R{i + 1}
            </span>
          ))}
          <span className="w-9 text-right">Sum</span>
        </span>
      </div>
      <div className="flex flex-col">
        {leaderboard.aggregate.map((row) => {
          const isMe = row.userId === meId;
          const podium = podiumOf(row.aggregateRank);
          return (
            <div
              key={row.userId}
              className={[
                'flex items-center justify-between px-3 py-[9px] text-small font-[family-name:var(--font-ui)] border-t border-[var(--ink-border-subtle)] first:border-t-0',
                isMe ? 'bg-[var(--ink-whisper)]' : '',
              ].join(' ')}
              style={{ fontWeight: 500 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="tabular-nums w-7 font-[family-name:var(--font-structure)]"
                  style={{ fontWeight: 700, color: podiumColor(podium) }}
                >
                  #{row.aggregateRank}
                </span>
                <span
                  className={[
                    'truncate',
                    isMe ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-soft)]',
                  ].join(' ')}
                  style={{ fontWeight: isMe ? 700 : 500 }}
                >
                  {row.displayName}
                  {isMe && (
                    <span
                      className="ml-1.5 text-caption text-[color:var(--accent)] font-[family-name:var(--font-structure)]"
                      style={{ fontWeight: 700 }}
                    >
                      you
                    </span>
                  )}
                </span>
              </div>
              <span className="flex items-center gap-2 text-[color:var(--ink-soft)] tabular-nums font-[family-name:var(--font-structure)]">
                {row.roundRanks.map((rank, i) => (
                  <span key={`r${i}`} className="w-5 text-center" style={{ fontWeight: 600 }}>
                    {rank}
                  </span>
                ))}
                <span
                  className="w-9 text-right text-[color:var(--ink)]"
                  style={{ fontWeight: 700 }}
                >
                  {row.rankSum}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankSumExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 bg-transparent border-none cursor-pointer text-left hover:bg-[var(--ink-whisper)] transition-colors duration-150 font-[family-name:var(--font-ui)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          How standings work
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[color:var(--ink-faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0 px-3 pb-3">
          Each round is ranked on its own. Your gauntlet score is the sum of your three
          round ranks — lowest wins. Crushing one round and stumbling in another can still
          come out ahead.
        </p>
      )}
    </div>
  );
}

function RoundRow({
  index,
  summary,
  onView,
}: {
  index: number;
  summary: GauntletRoundSummary | null;
  onView: () => void;
}) {
  // Single-line layout — round number + kind on the left, "#rank of N" on
  // the right. Rows share a card so the trio reads as a unit instead of
  // three discrete cards; the divider falls between rows.
  const isFirst = index === 0;
  const baseClasses =
    'flex items-center justify-between gap-3 px-3 py-[10px] bg-[var(--surface-card)] border-x border-[var(--ink-border-subtle)] font-[family-name:var(--font-ui)]';
  const positionClasses = `${isFirst ? 'border-t rounded-t-xl' : 'border-t-0'} ${
    index === 2 ? 'border-b rounded-b-xl' : 'border-b-0'
  }`;

  if (!summary) {
    return (
      <div className={`${baseClasses} ${positionClasses} opacity-60 shadow-[var(--shadow-card)]`}>
        <span className="text-small text-[color:var(--ink-muted)]">
          Round {index + 1} · not played
        </span>
      </div>
    );
  }
  const podium = podiumOf(summary.rank);
  return (
    <button
      type="button"
      onClick={onView}
      className={`${baseClasses} ${positionClasses} cursor-pointer hover:bg-[var(--ink-whisper)] transition-colors duration-150 text-left shadow-[var(--shadow-card)]`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="min-w-0 flex items-center gap-2">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)] tabular-nums"
          style={{ fontWeight: 700 }}
        >
          R{index + 1}
        </span>
        <span
          className="text-small text-[color:var(--ink)] truncate font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {roundTitle(summary.kind)}
        </span>
        {podium && <RankBadge rank={podium} />}
      </span>
      <span
        className="flex items-baseline gap-1.5 text-[color:var(--ink)] font-[family-name:var(--font-structure)] tabular-nums shrink-0"
        style={{ fontWeight: 700 }}
      >
        <span className="text-base">#{summary.rank ?? '—'}</span>
        <span className="text-caption text-[color:var(--ink-muted)]">of {summary.playersCount}</span>
      </span>
    </button>
  );
}
