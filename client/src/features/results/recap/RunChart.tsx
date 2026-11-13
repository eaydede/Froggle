import { useRef } from 'react';
import { runSegments, formatTime, scoreAt, type RunFind } from './run';

interface Props {
  you: RunFind[];
  opponent: RunFind[] | null;
  duration: number;
  yourFinish: number;
  opponentFinish: number;
  time: number;
  playing: boolean;
  live: boolean;
  onPlay: () => void;
  onScrub: (time: number) => void;
  onScrubbing: (active: boolean) => void;
}

export function RunChart({
  you,
  opponent,
  duration,
  yourFinish,
  opponentFinish,
  time,
  playing,
  live,
  onPlay,
  onScrub,
  onScrubbing,
}: Props) {
  const plot = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const max = Math.max(1, scoreAt(you, duration), scoreAt(opponent ?? [], duration));
  const yourSegments = runSegments(you, duration, max, time, yourFinish);
  const opponentSegments = opponent
    ? runSegments(opponent, duration, max, time, opponentFinish)
    : null;
  const hasEarlyFinish = yourFinish < duration || (opponent !== null && opponentFinish < duration);
  const yourScore = scoreAt(you, time);
  const oppScore = scoreAt(opponent ?? [], time);
  let yourTop = Math.max(0, Math.min(38, 52 - (yourScore / max) * 52 - 7));
  let oppTop = Math.max(0, Math.min(38, 52 - (oppScore / max) * 52 - 7));
  if (opponent && Math.abs(yourTop - oppTop) < 15) {
    if (yourTop >= oppTop) yourTop = Math.min(38, oppTop + 15);
    else oppTop = Math.min(38, yourTop + 15);
    if (Math.abs(yourTop - oppTop) < 15) oppTop = Math.max(0, yourTop - 15);
  }
  const scrub = (x: number) => {
    const rect = plot.current!.getBoundingClientRect();
    onScrub(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * duration);
  };
  const finish = () => {
    dragging.current = false;
    onScrubbing(false);
  };
  return (
    <div
      className="recap-chart"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onScrubbing(true);
        scrub(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) scrub(e.clientX);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    >
      <div
        ref={plot}
        className="recap-plot"
        role="slider"
        tabIndex={0}
        aria-label="Run playhead"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.floor(time)}
        aria-valuetext={formatTime(time)}
        onKeyDown={(e) => {
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? duration
                : e.key === 'ArrowLeft'
                  ? time - 1
                  : e.key === 'ArrowRight'
                    ? time + 1
                    : null;
          if (next !== null) {
            e.preventDefault();
            onScrub(Math.max(0, Math.min(duration, next)));
          }
        }}
      >
        <svg viewBox="0 0 100 52" preserveAspectRatio="none" aria-hidden>
          {opponentSegments && (
            <>
              <polyline points={opponentSegments.active} className="recap-curve opp" />
              {opponentSegments.afterFinish && (
                <polyline
                  points={opponentSegments.afterFinish}
                  className="recap-curve opp finished"
                >
                  <title>Opponent finished at {formatTime(opponentFinish)}</title>
                </polyline>
              )}
            </>
          )}
          <polyline points={yourSegments.active} className="recap-curve" />
          {yourSegments.afterFinish && (
            <polyline points={yourSegments.afterFinish} className="recap-curve finished">
              <title>You finished at {formatTime(yourFinish)}</title>
            </polyline>
          )}
        </svg>
        {live && (
          <div className="recap-playhead" style={{ left: `${(time / duration) * 100}%` }}>
            <span className="recap-head-dot" />
            <span
              className="recap-score-chip"
              style={{
                top: yourTop,
                transform:
                  time / duration > 0.62 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
              }}
            >
              {yourScore}
            </span>
            {opponent && (
              <span
                className="recap-score-chip opp"
                style={{
                  top: oppTop,
                  transform:
                    time / duration > 0.62 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
                }}
              >
                {oppScore}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          className={`recap-play ${playing ? 'playing' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onPlay}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M6 3l15 9-15 9z'} />
          </svg>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="recap-axis">
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <span key={p}>{formatTime(duration * p)}</span>
        ))}
      </div>
      {hasEarlyFinish && <div className="recap-finish-note">Dotted line: after finishing</div>}
    </div>
  );
}
