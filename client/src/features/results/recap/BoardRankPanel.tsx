import type { ResultsRankRung } from 'models/results';
import { getBoardDifficultyLevel, type BoardDifficulty } from 'models/timedRanks';
import { useRankClimb } from './useRankClimb';
import './boardRank.css';

export function BoardRankPanel({ points, rungs, difficulty, animate, onClimbStart, difficultyActive, onDifficulty }: {
  points: number; rungs: ResultsRankRung[]; difficulty?: BoardDifficulty; animate: boolean; onClimbStart: () => void; difficultyActive: boolean; onDifficulty: () => void;
}) {
  const { scroller, value, climbing, edges, onScroll, cancel } = useRankClimb(points, rungs, animate, onClimbStart);
  const active = rungs.find(rung => value >= rung.points)!;
  const final = rungs.find(rung => points >= rung.points)!;
  const next = rungs.find(rung => rung.ordinal === final.ordinal + 1);
  const mask = `linear-gradient(to bottom, ${edges.atTop ? 'black 0' : 'transparent 0, black 30px'}, ${edges.atBottom ? 'black 100%' : 'black calc(100% - 30px), transparent 100%'})`;
  return (
    <section className="board-rank-panel" aria-label="Board rank">
      <div className="board-rank-label">Your rank</div>
      <span className="sr-only" role="status">{final.name}. {next ? `${next.points - points} points to ${next.name}.` : 'Top rank reached.'}</span>
      <div ref={scroller} className="rank-carousel" role="list" aria-label="Rank ladder" tabIndex={0}
        data-climbing={climbing} data-at-top={edges.atTop} data-at-bottom={edges.atBottom}
        style={{ maskImage: mask, WebkitMaskImage: mask, scrollSnapType: climbing ? 'none' : 'y mandatory' }}
        onScroll={onScroll} onWheel={cancel} onTouchStart={cancel} onPointerDown={cancel}
        onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) cancel(); }}>
        {rungs.map(rung => {
          const selected = rung.ordinal === active.ordinal;
          const reached = value >= rung.points;
          const color = `var(${rung.colorToken})`;
          const fill = reached && rung === rungs[0]
            ? 1
            : Math.max(0, Math.min(1, (value - rung.points) / Math.max(1, rung.nextPoints - rung.points)));
          return <div key={rung.ordinal} role="listitem" className={`rank-rung${selected ? ' current' : ''}`}
            aria-current={rung.ordinal === final.ordinal ? 'step' : undefined}
            aria-label={`${rung.name}, ${rung.points} points${rung.ordinal === final.ordinal ? ', your rank' : ''}`}
            style={{ '--rank-color': color, background: selected ? `color-mix(in srgb, ${color} 14%, transparent)` : 'transparent' } as React.CSSProperties}>
            <span className="rank-rung-bar" aria-hidden="true"><span style={{ height: `${fill * 100}%` }} /></span>
            <span className="rank-rung-name" style={{ color: selected ? color : reached ? 'var(--ink)' : 'var(--rank-muted)' }}>{rung.name}</span>
            {!climbing && next && rung.ordinal === next.ordinal && <span className="rank-rung-needed">+{next.points - points}</span>}
            <span className="rank-rung-points" aria-hidden="true">{rung.points}{rung.collapsed ? '+' : ''}</span>
          </div>;
        })}
      </div>
      <BoardDifficultySummary difficulty={difficulty} active={difficultyActive} onClick={onDifficulty} />
    </section>
  );
}

function BoardDifficultySummary({ difficulty, active, onClick }: { difficulty?: BoardDifficulty; active: boolean; onClick: () => void }) {
  const level = getBoardDifficultyLevel(difficulty?.percentile);
  const color = level ? `var(${level.colorToken})` : 'var(--ink-soft)';
  return <button type="button" className="board-difficulty" aria-label="View words by difficulty" aria-pressed={active} aria-controls="results-words" onClick={onClick}>
    <div className="board-difficulty-header">
      <span className="board-rank-label">This board</span>
      <span className="board-difficulty-name" style={{ color }}>{level?.name ?? '—'}</span>
    </div>
    <div className="board-difficulty-pips" role="img" aria-label={level ? `${level.index + 1} of 5 difficulty` : 'Difficulty unavailable'}>
      {Array.from({ length: 5 }, (_, index) => <span key={index} style={{ background: level && index <= level.index ? color : 'var(--rank-rule)' }} />)}
    </div>
    <span className="board-difficulty-comparison">{level ? `Harder than ${difficulty!.percentile}% of boards` : 'Board comparison unavailable.'}</span>
  </button>;
}
