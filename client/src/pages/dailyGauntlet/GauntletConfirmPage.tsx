import type { GauntletRoundConfig } from 'models/gauntlet';
import { InkButton } from '../../shared/components/InkButton';
import { modifierBadge, modifierDescription, roundTitle } from './modifierDisplay';

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

function formatTimer(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
      <div className="w-full max-w-[380px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
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

          <ModifierCard description={modifierDescription(config.modifier)} badge={modifierBadge(config.modifier)} />

          {config.modifier.kind === 'hotLetter' && (
            <BonusLetterCard
              letter={config.modifier.letter}
              multiplier={config.modifier.multiplier}
            />
          )}

          <ConfigCard boardSize={config.boardSize} timeLimit={config.timeLimit} minWordLength={config.minWordLength} />

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

function ProgressDots({
  current,
  total,
  completedRounds,
  onViewRoundResult,
}: {
  current: number;
  total: number;
  completedRounds: number[];
  onViewRoundResult: (index: number) => void;
}) {
  const doneSet = new Set(completedRounds);
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={`Round ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = doneSet.has(i);
        const active = i === current;
        // Past rounds are tappable — they go to that round's result page so
        // the player can revisit their words without aborting the run.
        if (done && !active) {
          return (
            <button
              key={`r${i}`}
              type="button"
              onClick={() => onViewRoundResult(i)}
              aria-label={`See round ${i + 1} result`}
              className="block h-1.5 w-4 rounded-full bg-[var(--ink)] transition-transform duration-150 hover:scale-y-150 cursor-pointer border-none p-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          );
        }
        return (
          <span
            key={`r${i}`}
            className={`block h-1.5 rounded-full transition-colors duration-200 ${
              active ? 'w-8 bg-[var(--accent)]' : 'w-4 bg-[var(--track)]'
            }`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

// Today's-specifics for the bonus round. The card itself uses the
// neutral surface tokens (so it contrasts cleanly in both light and dark
// themes), and the tile inside renders in the full hot-letter palette —
// same lavender backdrop + edges the player sees on the in-game board.
// That way the tile here is the visual anchor: "this is what to hunt
// for, and this is exactly how it'll look".
function BonusLetterCard({ letter, multiplier }: { letter: string; multiplier: number }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-4 flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Today's bonus letter
        </span>
        <span
          className="text-base mt-0.5 text-[color:var(--ink)]"
          style={{ fontWeight: 700 }}
        >
          Words with it score {multiplier}×
        </span>
      </div>
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 56,
          height: 56,
          backgroundColor: 'var(--hot-letter-bg)',
          color: 'var(--hot-letter-fg)',
          fontFamily: 'var(--font-cell)',
          fontWeight: 800,
          fontSize: '2rem',
          boxShadow:
            '0 3px 0 0 var(--hot-letter-edge), 0 4px 0 0 var(--hot-letter-edge-deep), 0 6px 10px var(--hot-letter-glow)',
        }}
        aria-label={`Bonus letter ${letter}`}
      >
        {letter}
      </div>
    </div>
  );
}

function ModifierCard({ description, badge }: { description: string; badge: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Scoring rule
        </span>
        <span
          className="text-caption text-[color:var(--accent)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {badge}
        </span>
      </div>
      <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0">{description}</p>
    </div>
  );
}

function ConfigCard({
  boardSize,
  timeLimit,
  minWordLength,
}: {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-3 px-3 py-3">
        <ConfigItem label="Board" value={`${boardSize}×${boardSize}`} divider />
        <ConfigItem label="Time" value={formatTimer(timeLimit)} divider />
        <ConfigItem label="Letters" value={String(minWordLength)} />
      </div>
    </div>
  );
}

function ConfigItem({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div className="relative text-center py-1 px-2">
      <div
        className="text-label-xs uppercase tracking-[0.06em] text-[color:var(--ink-soft)] leading-none mb-1.5"
        style={{ fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        className="text-xl leading-none tabular-nums tracking-[-0.01em] text-[color:var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {value}
      </div>
      {divider && (
        <span
          aria-hidden
          className="absolute right-0 top-[15%] bottom-[15%] w-px bg-[var(--ink-border-subtle)]"
        />
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}
