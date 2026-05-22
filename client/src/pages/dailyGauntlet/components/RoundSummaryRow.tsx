import type { GauntletRoundSummary } from 'models/gauntlet';
import { RankBadge } from '../../landing/components/RankBadge';
import { roundTitle } from '../modifierDisplay';
import { podiumOf } from './podium';

// Single-line per-round row in the gauntlet aggregate standings. Three
// rows share a card via the position-aware border classes so the trio
// reads as a unit instead of three discrete cards.
export function RoundSummaryRow({
  index,
  summary,
  onView,
}: {
  index: number;
  summary: GauntletRoundSummary | null;
  onView: () => void;
}) {
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
