import type { ExperimentalModeMeta } from 'models/experimental';
import { InkButton } from '../../shared/components/InkButton';
import { BackButton, ConfigCard } from '../dailyGauntlet/components';

interface ExperimentalOverviewPageProps {
  dateLabel: string;
  puzzleNumber: number;
  meta: ExperimentalModeMeta;
  state: 'unplayed' | 'in-progress' | 'completed';
  onStart: () => void;
  onResume: () => void;
  onSeeResults: () => void;
  onBack: () => void;
}

// Start-gate screen for one experimental mode. Deliberately terse — matches
// the density of the gauntlet confirm page (title + single-sentence rule +
// config + start), not a tutorial. The mode's twist is a one-liner from the
// registry; everything else is discovered in play.
export function ExperimentalOverviewPage({
  dateLabel,
  puzzleNumber,
  meta,
  state,
  onStart,
  onResume,
  onSeeResults,
  onBack,
}: ExperimentalOverviewPageProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="flex items-center pt-[18px]">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex-1 flex flex-col justify-center gap-[24px] px-1 mt-2">
          <div className="text-center">
            <div
              className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-3 font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              {dateLabel} · Experimental #{puzzleNumber}
            </div>
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              {meta.name}
            </div>
            <div
              className="mt-1 text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              {meta.tagline}
            </div>
          </div>

          <RuleCard rule={meta.rule} />

          <ConfigCard
            boardSize={meta.boardSize}
            timeLimit={meta.timeLimit}
            minWordLength={meta.minWordLength}
          />

          <p className="text-small text-[color:var(--ink-muted)] text-center leading-[1.5]">
            {state === 'completed'
              ? "You've already finished this one."
              : 'One attempt. The timer starts when you tap start.'}
          </p>

          <div className="flex flex-col gap-1">
            {state === 'completed' ? (
              <InkButton onClick={onSeeResults}>Results</InkButton>
            ) : state === 'in-progress' ? (
              <InkButton onClick={onResume}>Resume</InkButton>
            ) : (
              <InkButton onClick={onStart}>Start</InkButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// The single-sentence rule card. Mirrors the gauntlet's ModifierCard shape so
// the two feel like the same style of start gate; the "Rule" header replaces
// the gauntlet's "Scoring rule" since experimental twists aren't always about
// scoring per se (e.g. Time is Money changes the clock).
function RuleCard({ rule }: { rule: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Rule
        </span>
      </div>
      <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0">{rule}</p>
    </div>
  );
}
