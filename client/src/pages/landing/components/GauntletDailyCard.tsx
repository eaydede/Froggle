import type { GauntletEntry } from 'models/gauntlet';
import { StatusIcon } from '../../../shared/components/StatusIcon';

interface GauntletDailyCardProps {
  entry: GauntletEntry | null;
  onPlay: () => void;
}

// Compact landing entry for the gauntlet. Doesn't reuse DailyRow because
// the gauntlet's hub view shows progress through 3 rounds (and an aggregate
// rank when finished) rather than the points/words shape DailyRow is
// shaped around. Visual rhythm (height, avatar, chevron) matches the
// other daily rows.
export function GauntletDailyCard({ entry, onPlay }: GauntletDailyCardProps) {
  const completedRounds = entry?.rounds.filter((r) => r?.endedAt).length ?? 0;
  const state: 'unplayed' | 'in-progress' | 'completed' =
    entry?.state === 'completed'
      ? 'completed'
      : entry && entry.state === 'partial'
      ? 'in-progress'
      : 'unplayed';

  return (
    <div className="flex items-stretch w-full rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden font-[family-name:var(--font-ui)]">
      <button
        type="button"
        onClick={onPlay}
        className="group flex-1 flex items-center gap-3 px-4 py-[12px] bg-transparent border-none cursor-pointer select-none text-left hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-colors duration-150 min-w-0"
        style={{ WebkitTapHighlightColor: 'transparent', minHeight: 60 }}
      >
        <GauntletAvatar />
        <div className="flex-1 flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)] truncate"
              style={{ fontWeight: 700 }}
            >
              Gauntlet
            </span>
            {state !== 'unplayed' && <StatusIcon state={state} />}
          </div>
          <HintLine state={state} entry={entry} completedRounds={completedRounds} />
        </div>
        <Chevron />
      </button>
    </div>
  );
}

function HintLine({
  state,
  entry,
  completedRounds,
}: {
  state: 'unplayed' | 'in-progress' | 'completed';
  entry: GauntletEntry | null;
  completedRounds: number;
}) {
  if (state === 'completed' && entry) {
    return (
      <span
        className="text-small text-[color:var(--ink-muted)] truncate"
        style={{ fontWeight: 500 }}
      >
        Rank{' '}
        <span
          className="font-[family-name:var(--font-structure)] text-[color:var(--ink)]"
          style={{ fontWeight: 700 }}
        >
          #{entry.aggregateRank ?? '—'}
        </span>{' '}
        · rank-sum {entry.aggregateRankSum ?? '—'}
      </span>
    );
  }
  if (state === 'in-progress') {
    return (
      <span
        className="text-small text-[color:var(--ink-muted)] truncate"
        style={{ fontWeight: 500 }}
      >
        {completedRounds}/3 rounds done
      </span>
    );
  }
  return (
    <span
      className="text-small text-[color:var(--ink-muted)] truncate"
      style={{ fontWeight: 500 }}
    >
      3 rounds · 3 modifiers
    </span>
  );
}

function GauntletAvatar() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0 bg-[var(--podium-bronze-bg)] text-[color:var(--podium-bronze)]"
      style={{ width: 32, height: 32 }}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M7.5 7.5l3 3M13.5 13.5l3 3" />
      </svg>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[color:var(--ink-faint)] group-hover:text-[color:var(--ink-muted)] group-hover:translate-x-[2px] transition-[transform,color] duration-200"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
