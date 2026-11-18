import { getTimedRank, RANK_TITLES, type TimedRankTargets } from 'models/timedRanks';
import { useEffect, useRef } from 'react';
import { IconAction } from '../../ui/IconAction';

export function RankLadder({ points, targets, onClose }: { points: number; targets: TimedRankTargets; onClose: () => void; }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const current = getTimedRank(points, targets);
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  // Native modal dialogs enter the top layer while inheriting the results theme.
  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      aria-labelledby="timed-rank-title"
      className="font-[family-name:var(--font-ui)] fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-[420px] max-h-[85dvh] rounded-t-2xl border-0 bg-[var(--surface-card)] text-[color:var(--ink)] p-0 backdrop:bg-black/45 backdrop:backdrop-blur-[2px] shadow-xl">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id="timed-rank-title" className="font-[family-name:var(--font-display)] text-2xl italic">Rank ladder</h2>
          <IconAction onClick={onClose} label="Close rank ladder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></IconAction>
        </div>
        <ol className="flex flex-col gap-2 list-none p-0 m-0">
          {RANK_TITLES.map((rank, index) => {
            const threshold = targets.thresholds[index];
            const reached = points >= threshold;
            return <li key={rank.id} className="flex items-center gap-3 rounded-lg border border-[var(--ink-border-subtle)] bg-[var(--surface-panel)] px-3 py-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${rank.colorToken})`, opacity: reached ? 1 : 0.35 }} />
              <span className="flex-1 font-semibold">{index === 4 ? 'Legend 1' : rank.name}</span>
              <span className="text-caption tabular-nums text-[color:var(--ink-soft)]">{threshold} pts</span>
              {current?.id === rank.id && <span className="text-caption font-semibold">You</span>}
            </li>;
          })}
        </ol>
        <p className="text-caption text-[color:var(--ink-soft)] mt-4">Targets reflect this board’s words and game rules. Everyone plays toward the same targets. Legend 1 targets the top 7% of historical performances under comparable rules. Further Legend levels repeat the Virtuoso-to-Legend 1 point gap.</p>
        <p className="text-caption text-[color:var(--ink-muted)] mt-2">Word-frequency data: <a className="underline text-inherit" href="https://github.com/rspeer/wordfreq" target="_blank" rel="noreferrer">wordfreq by Robyn Speer</a>, adapted under <a className="underline text-inherit" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p>
      </div>
    </dialog>
  );
}
