import { useState } from 'react';
import { RankLadder } from '../../timed-ranks/RankLadder';
import { getNextTimedRank, getTimedRank, RANK_TITLES, type TimedRankTargets } from 'models/timedRanks';

const circumference = 2 * Math.PI * 44;

/** A board's saved targets, independent of who played it. Legend levels keep the ring full. */
export function BoardRankRing({ points, targets }: { points: number; targets: TimedRankTargets }) {
  const [ladderOpen, setLadderOpen] = useState(false);
  const current = getTimedRank(points, targets);
  const next = getNextTimedRank(points, targets);
  const legendPoints = targets.thresholds[4];
  return (
    <section className="board-rank" aria-label="Board rank">
      <div className="recap-metric-header board-rank-header">
        <span>Board rank</span>
      </div>
      <div className="board-rank-body">
        <button type="button" className="board-rank-ring" aria-label="View rank ladder"
          aria-haspopup="dialog" aria-expanded={ladderOpen} onClick={() => setLadderOpen(true)}>
          <span className="board-rank-graphic" role="img" aria-label={`${current?.name ?? 'Unranked'}, rank ${current ? current.index + 1 : 0} of 5`}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <g transform="rotate(-90 50 50)" fill="none">
                <circle cx="50" cy="50" r="44" stroke="var(--ink-whisper)" strokeWidth="7" />
                {targets.thresholds.map((threshold, index) => {
                  const start = index === 0 ? 0 : targets.thresholds[index - 1];
                  const length = Math.max(0, Math.min(threshold, points) - start) / legendPoints * circumference;
                  return length > 0 && <circle key={RANK_TITLES[index].id} cx="50" cy="50" r="44" stroke={`var(${RANK_TITLES[index].colorToken})`} strokeWidth="7"
                    strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start / legendPoints * circumference} />;
                })}
                {targets.thresholds.slice(0, -1).map(threshold => (
                  <circle key={threshold} cx="50" cy="50" r="44" stroke="var(--surface-panel)" strokeWidth="9"
                    strokeDasharray={`1.6 ${circumference - 1.6}`} strokeDashoffset={-threshold / legendPoints * circumference + 0.8} />
                ))}
              </g>
            </svg>
            <span className="board-rank-center" aria-hidden="true">
              <span>Rank {current ? current.index + 1 : 0} of 5</span>
              <strong style={{ color: current ? `var(${current.colorToken})` : 'var(--ink-muted)' }}>{current?.name ?? 'Unranked'}</strong>
            </span>
          </span>
        </button>
        <div className="board-rank-next">
          <strong>+{next.pointsToNext}</strong>
          <span>To <span style={{ color: `var(${next.colorToken})` }}>{next.name}</span></span>
        </div>
      </div>
      {ladderOpen && <RankLadder points={points} targets={targets} onClose={() => setLadderOpen(false)} />}
    </section>
  );
}
