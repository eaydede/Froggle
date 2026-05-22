import { GAUNTLET_ROUND_COUNT } from 'models/gauntlet';
import type { GauntletLeaderboardResponse } from '../../../shared/api/gauntletApi';
import { podiumColor, podiumOf } from './podium';

// Full standings table on the gauntlet aggregate results page. Renders
// every player who has finalized all three rounds, with their per-round
// ranks and the rank-sum total. The viewer's row gets the whisper
// background and the "you" badge so they can find themselves at a glance.
export function StandingsLeaderboard({
  leaderboard,
}: {
  leaderboard: GauntletLeaderboardResponse;
}) {
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
