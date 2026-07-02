import { EXPERIMENTAL_MODES, type ExperimentalModeKey } from 'models/experimental';
import { StatusIcon } from '../../shared/components/StatusIcon';
import { RankBadge, type PodiumRank } from '../landing/components/RankBadge';
import { BackButton } from '../dailyGauntlet/components';
import { ExperimentalModeAvatar } from './components/ExperimentalModeAvatar';
import { formatClock, timeSurvivedSeconds } from './experimentalUtils';
import type { ExperimentalTileStatus } from '../../shared/api/dailyExperimentalApi';

interface ExperimentalHubPageProps {
  dateLabel: string;
  puzzleNumber: number;
  statuses: ExperimentalTileStatus[];
  onSelect: (mode: ExperimentalModeKey, state: ExperimentalTileStatus['state']) => void;
  onBack: () => void;
}

// The experimental group's picker. Distinct header + "Experimental" framing so
// it's unmistakable the player has stepped off the landing page into the lab.
// Tiles mirror the daily-mode rows (avatar, status icon, podium badge) so the
// completion states read the same as the rest of the app.
export function ExperimentalHubPage({
  dateLabel,
  puzzleNumber,
  statuses,
  onSelect,
  onBack,
}: ExperimentalHubPageProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="flex items-center pt-[18px]">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <div
              className="inline-block rounded-full px-3 py-1 bg-[var(--ink-whisper)] text-[color:var(--ink-soft)] text-caption uppercase tracking-[0.12em] font-[family-name:var(--font-structure)] mb-3"
              style={{ fontWeight: 700 }}
            >
              Experimental
            </div>
            <div
              className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              Try something new.
            </div>
            <p className="mt-3 text-small text-[color:var(--ink-muted)] leading-[1.5] mx-auto max-w-[300px]">
              {dateLabel} · Set #{puzzleNumber}. Prototype modes we're testing —
              play one and tell us how it felt.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {statuses.map((status) => (
              <ExperimentalHubTile
                key={status.modeKey}
                status={status}
                onSelect={() => onSelect(status.modeKey, status.state)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperimentalHubTile({
  status,
  onSelect,
}: {
  status: ExperimentalTileStatus;
  onSelect: () => void;
}) {
  const meta = EXPERIMENTAL_MODES[status.modeKey];
  const podium: PodiumRank | null =
    status.state === 'completed' &&
    (status.rank === 1 || status.rank === 2 || status.rank === 3)
      ? (status.rank as PodiumRank)
      : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 w-full rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-[12px] cursor-pointer select-none text-left hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-colors duration-150 min-w-0"
      style={{ WebkitTapHighlightColor: 'transparent', minHeight: 60 }}
    >
      <ExperimentalModeAvatar mode={status.modeKey} size={32} />
      <div className="flex-1 flex flex-col gap-[3px] min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)] truncate"
            style={{ fontWeight: 700 }}
          >
            {meta.name}
          </span>
          {podium && <RankBadge rank={podium} />}
          {status.state !== 'unplayed' && <StatusIcon state={status.state} />}
        </div>
        <TileHint status={status} />
      </div>
      <Chevron />
    </button>
  );
}

function TileHint({ status }: { status: ExperimentalTileStatus }) {
  const meta = EXPERIMENTAL_MODES[status.modeKey];

  if (status.state === 'completed' && status.points !== null) {
    const headline =
      meta.heroStat === 'timeSurvived'
        ? formatClock(timeSurvivedSeconds(meta.timeLimit, status.points))
        : `${status.points}`;
    const label = meta.heroStat === 'timeSurvived' ? 'played' : 'pts';
    return (
      <span
        className="flex items-baseline gap-1.5 text-small text-[color:var(--ink-muted)] truncate"
        style={{ fontWeight: 500 }}
      >
        <span
          className="text-[color:var(--ink)] font-[family-name:var(--font-structure)] tabular-nums"
          style={{ fontWeight: 700 }}
        >
          {headline}
        </span>
        {label}
        {status.rank !== null && <span>· rank #{status.rank}</span>}
      </span>
    );
  }
  if (status.state === 'in-progress') {
    return (
      <span className="text-small text-[color:var(--ink-muted)] truncate" style={{ fontWeight: 500 }}>
        Pick up where you left off
      </span>
    );
  }
  return (
    <span className="text-small text-[color:var(--ink-muted)] truncate" style={{ fontWeight: 500 }}>
      {meta.tagline}
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
