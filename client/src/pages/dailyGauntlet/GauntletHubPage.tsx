import type { GauntletRoundKind } from 'models/gauntlet';
import { InkButton } from '../../shared/components/InkButton';
import { roundTitle } from './modifierDisplay';
import { BackButton } from './components';

interface GauntletHubPageProps {
  dateLabel: string;
  puzzleNumber: number;
  roundKinds: GauntletRoundKind[];
  onStart: () => void;
  onBack: () => void;
}

// Intro screen for an unplayed gauntlet. Shows the three rounds the player
// is about to face so the chain is legible up front, then hands off to
// the first round's confirm page. Once the player has started any round,
// they never see this screen again that day — the route auto-redirects.
export function GauntletHubPage({
  dateLabel,
  puzzleNumber,
  roundKinds,
  onStart,
  onBack,
}: GauntletHubPageProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="flex items-center pt-[18px]">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <div
              className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-3 font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              {dateLabel} · Gauntlet #{puzzleNumber}
            </div>
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              Three rounds. One chain.
            </div>
            <p className="mt-3 text-small text-[color:var(--ink-muted)] leading-[1.5] mx-auto max-w-[300px]">
              Each round has its own board, timer, and scoring twist. Play them in
              order — your standing is the sum of your three ranks.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {roundKinds.map((kind, index) => (
              <RoundRow key={`r${index}`} index={index} kind={kind} />
            ))}
          </div>

          <InkButton onClick={onStart}>Start gauntlet</InkButton>
        </div>
      </div>
    </div>
  );
}

function RoundRow({ index, kind }: { index: number; kind: GauntletRoundKind }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-3 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-[var(--ink-whisper)] text-[color:var(--ink-soft)] flex-shrink-0 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {index + 1}
      </div>
      <div className="min-w-0">
        <div
          className="text-base leading-tight font-[family-name:var(--font-structure)] text-[color:var(--ink)]"
          style={{ fontWeight: 700 }}
        >
          {roundTitle(kind)}
        </div>
        <div className="text-caption text-[color:var(--ink-soft)]">{kindHint(kind)}</div>
      </div>
    </div>
  );
}

function kindHint(kind: GauntletRoundKind): string {
  switch (kind) {
    case 'regular':
      return 'Standard scoring, no twist';
    case 'hotLetter':
      return 'One letter scores 2×';
    case 'rareLetters':
      return 'Letters score by their value';
  }
}

