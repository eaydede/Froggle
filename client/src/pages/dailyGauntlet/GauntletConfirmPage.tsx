import type { GauntletRoundConfig } from 'models/gauntlet';
import { InkButton } from '../../shared/components/InkButton';
import { modifierBadge, modifierDescription, roundTitle } from './modifierDisplay';
import {
  BackButton,
  BonusLetterCard,
  ConfigCard,
  ModifierCard,
  ProgressDots,
} from './components';

interface GauntletConfirmPageProps {
  dateLabel: string;
  puzzleNumber: number;
  totalRounds: number;
  config: GauntletRoundConfig;
  /** Indices of rounds already finished. Used to make their progress
   *  dots tappable so mid-gauntlet players can revisit prior results. */
  completedRounds: number[];
  alreadyEnded: boolean;
  onStart: () => void;
  onSeeResult: () => void;
  onViewRoundResult: (index: number) => void;
  onBack: () => void;
}

export function GauntletConfirmPage({
  dateLabel,
  puzzleNumber,
  totalRounds,
  config,
  completedRounds,
  alreadyEnded,
  onStart,
  onSeeResult,
  onViewRoundResult,
  onBack,
}: GauntletConfirmPageProps) {
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
              {dateLabel} · Gauntlet #{puzzleNumber}
            </div>
            <ProgressDots
              current={config.index}
              total={totalRounds}
              completedRounds={completedRounds}
              onViewRoundResult={onViewRoundResult}
            />
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)] mt-3"
              style={{ fontWeight: 500 }}
            >
              {roundTitle(config.kind)}
            </div>
            <div
              className="mt-1 text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              Round {config.index + 1} of {totalRounds}
            </div>
          </div>

          <ModifierCard
            description={modifierDescription(config.modifier)}
            badge={modifierBadge(config.modifier)}
          />

          {config.modifier.kind === 'hotLetter' && (
            <BonusLetterCard letter={config.modifier.letter} />
          )}

          <ConfigCard
            boardSize={config.boardSize}
            timeLimit={config.timeLimit}
            minWordLength={config.minWordLength}
          />

          <p className="text-small text-[color:var(--ink-muted)] text-center leading-[1.5]">
            {alreadyEnded
              ? "You've already finished this round."
              : 'One attempt. The timer starts when you tap start.'}
          </p>

          <div className="flex flex-col gap-1">
            {alreadyEnded ? (
              <InkButton onClick={onSeeResult}>Results</InkButton>
            ) : (
              <InkButton onClick={onStart}>Start</InkButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
