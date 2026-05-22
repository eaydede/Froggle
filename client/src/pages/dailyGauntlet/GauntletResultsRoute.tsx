import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchGauntletLeaderboard,
  fetchGauntletStatus,
  type GauntletLeaderboardResponse,
  type GauntletStatusResponse,
} from '../../shared/api/gauntletApi';
import { InkButton } from '../../shared/components/InkButton';
import {
  RankSumExplainer,
  RoundSummaryRow,
  StandingsLeaderboard,
} from './components';

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
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px] gap-3">
        <div className="flex items-center">
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
            <RoundSummaryRow
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
          <StandingsLeaderboard leaderboard={leaderboard} />
        )}
      </div>
    </div>
  );
}
