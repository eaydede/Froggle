import { timeSurvivedSeconds } from 'models/timeIsMoney';
import { StatusIcon } from '../../../shared/components/StatusIcon';
import { RankBadge, type PodiumRank } from './RankBadge';

export interface TimeIsMoneyCardStatus {
  state: 'unplayed' | 'in-progress' | 'completed';
  points: number | null;
  wordCount: number | null;
  rank: number | null;
  /** The run's own starting clock — not today's config, so a retune doesn't
   *  restate a run that was played under the old one. */
  timeLimit: number | null;
}

interface TimeIsMoneyDailyCardProps {
  status: TimeIsMoneyCardStatus;
  onPlay: () => void;
}

// Landing entry for Time is Money. Doesn't reuse DailyRow because the headline
// stat is the clock the run bought, not the points behind it, and there's no
// per-mode leaderboard page to hang a trophy column off. Visual rhythm
// (height, avatar, chevron) matches the other daily rows.
export function TimeIsMoneyDailyCard({ status, onPlay }: TimeIsMoneyDailyCardProps) {
  const podium: PodiumRank | null =
    status.state === 'completed' &&
    (status.rank === 1 || status.rank === 2 || status.rank === 3)
      ? status.rank
      : null;

  return (
    <div className="flex items-stretch w-full rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden font-[family-name:var(--font-ui)]">
      <button
        type="button"
        onClick={onPlay}
        className="group flex-1 flex items-center gap-3 px-4 py-[12px] bg-transparent border-none cursor-pointer select-none text-left hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-colors duration-150 min-w-0"
        style={{ WebkitTapHighlightColor: 'transparent', minHeight: 60 }}
      >
        <ClockCoinAvatar />
        <div className="flex-1 flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)] truncate"
              style={{ fontWeight: 700 }}
            >
              Time is Money
            </span>
            {podium && <RankBadge rank={podium} />}
            {status.state !== 'unplayed' && <StatusIcon state={status.state} />}
          </div>
          <HintLine status={status} />
        </div>
        <Chevron />
      </button>
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function HintLine({ status }: { status: TimeIsMoneyCardStatus }) {
  if (status.state === 'completed' && status.points !== null && status.timeLimit !== null) {
    return (
      <span
        className="text-small text-[color:var(--ink-muted)] truncate"
        style={{ fontWeight: 500 }}
      >
        <span
          className="font-[family-name:var(--font-structure)] text-[color:var(--ink)] tabular-nums"
          style={{ fontWeight: 700 }}
        >
          {formatClock(timeSurvivedSeconds(status.timeLimit, status.points))}
        </span>{' '}
        played · {status.wordCount} {status.wordCount === 1 ? 'word' : 'words'}
      </span>
    );
  }
  return (
    <span
      className="text-small text-[color:var(--ink-muted)] truncate"
      style={{ fontWeight: 500 }}
    >
      {status.state === 'in-progress'
        ? 'Pick up where you left off'
        : 'Every word buys you more time'}
    </span>
  );
}

function ClockCoinAvatar() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0 bg-[var(--compare-you-bg)] text-[color:var(--compare-you)]"
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
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        <path d="M12 12h.01" />
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
