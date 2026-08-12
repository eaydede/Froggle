import { TIME_IS_MONEY_CONFIG } from 'models/timeIsMoney';
import { InkButton } from '../../shared/components/InkButton';
import { BackButton, ConfigCard } from '../dailyGauntlet/components';

interface TimeIsMoneyOverviewPageProps {
  dateLabel: string;
  puzzleNumber: number;
  state: 'unplayed' | 'in-progress' | 'completed';
  onStart: () => void;
  onResume: () => void;
  onSeeResults: () => void;
  onBack: () => void;
}

// Start gate for Time is Money. Deliberately terse — matches the density of
// the gauntlet confirm page (title + single-sentence rule + config + start),
// not a tutorial. The twist is a one-liner; the rest is discovered in play.
export function TimeIsMoneyOverviewPage({
  dateLabel,
  puzzleNumber,
  state,
  onStart,
  onResume,
  onSeeResults,
  onBack,
}: TimeIsMoneyOverviewPageProps) {
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
              {dateLabel} · Time is Money #{puzzleNumber}
            </div>
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              Time is Money
            </div>
            <div
              className="mt-1 text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              Every word buys you more time.
            </div>
          </div>

          <RuleCard rule="Each word adds two seconds to the clock for every point it scores." />

          <ConfigCard
            boardSize={TIME_IS_MONEY_CONFIG.boardSize}
            timeLimit={TIME_IS_MONEY_CONFIG.timeLimit}
            minWordLength={TIME_IS_MONEY_CONFIG.minWordLength}
          />

          <p className="text-small text-[color:var(--ink-muted)] text-center leading-[1.5]">
            {state === 'completed'
              ? "You've already finished today's run."
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
// the two feel like the same style of start gate; the header reads "Rule"
// rather than "Scoring rule" because this twist is about the clock.
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
