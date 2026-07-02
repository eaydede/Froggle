import { ExperimentalGroupAvatar } from './ExperimentalModeAvatar';

interface ExperimentalDailyCardProps {
  /** How many experimental modes the player has finished today, and how many
   *  exist. Drives the hint line; omitted (both 0) reads as a plain nudge. */
  played: number;
  total: number;
  onOpen: () => void;
}

// Landing entry for the experimental group. One tap opens the hub where the
// individual prototype modes live. Visual rhythm matches the other daily rows.
export function ExperimentalDailyCard({ played, total, onOpen }: ExperimentalDailyCardProps) {
  const allDone = total > 0 && played >= total;
  const hint = allDone
    ? 'All caught up — results inside'
    : played > 0
      ? `${played}/${total} played today`
      : total > 0
        ? `${total} prototype modes · vote as you go`
        : 'Prototype modes · vote as you go';

  return (
    <div className="flex items-stretch w-full rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden font-[family-name:var(--font-ui)]">
      <button
        type="button"
        onClick={onOpen}
        className="group flex-1 flex items-center gap-3 px-4 py-[12px] bg-transparent border-none cursor-pointer select-none text-left hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-colors duration-150 min-w-0"
        style={{ WebkitTapHighlightColor: 'transparent', minHeight: 60 }}
      >
        <ExperimentalGroupAvatar size={32} />
        <div className="flex-1 flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)] truncate"
              style={{ fontWeight: 700 }}
            >
              Experimental
            </span>
          </div>
          <span className="text-small text-[color:var(--ink-muted)] truncate" style={{ fontWeight: 500 }}>
            {hint}
          </span>
        </div>
        <Chevron />
      </button>
    </div>
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
