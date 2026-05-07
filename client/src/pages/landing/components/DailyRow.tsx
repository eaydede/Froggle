import { ModeAvatar, TrophyIcon } from "./ModeAvatar";
import { RankBadge, type PodiumRank } from "./RankBadge";
import { StatusIcon } from "../../../shared/components/StatusIcon";

export type DailyMode = "timed" | "zen";
export type DailyState = "unplayed" | "in-progress" | "completed";

export interface DailyRowResults {
  points: number;
  words: number;
  /** When set, the words count renders as `words/totalWords`. */
  totalWords?: number;
}

interface DailyRowProps {
  mode: DailyMode;
  label: string;
  state: DailyState;
  /** Top-3 finish badge. Only rendered when results are present. */
  podium: PodiumRank | null;
  results: DailyRowResults | null;
  /** Mode-specific copy shown when the row is unplayed. e.g.
   *  "2-minute timer · 5×5". Ignored when there's a result or in-progress
   *  session — those states have their own line. */
  unplayedHint: string;
  onPrimary: () => void;
  onLeaderboard: () => void;
}

// Compact split-row for one daily mode. Left half is the primary tap
// (Play / Resume / See result), right half is the per-mode leaderboard.
// The inner divider is short and centered so the trophy column doesn't
// read as its own outlined sub-card when the parent's rounded corners
// "clip" the perceived rectangle around it.
export function DailyRow({
  mode,
  label,
  state,
  podium,
  results,
  unplayedHint,
  onPrimary,
  onLeaderboard,
}: DailyRowProps) {
  return (
    <div className="flex items-stretch w-full rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden font-[family-name:var(--font-ui)]">
      <button
        type="button"
        onClick={onPrimary}
        className="group flex-1 flex items-center gap-3 px-4 py-[12px] bg-transparent border-none cursor-pointer select-none text-left hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-colors duration-150 min-w-0"
        style={{ WebkitTapHighlightColor: "transparent", minHeight: 60 }}
      >
        <ModeAvatar mode={mode} size={32} />
        <div className="flex-1 flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)] truncate"
              style={{ fontWeight: 700 }}
            >
              {label}
            </span>
            {podium && <RankBadge rank={podium} />}
            {state !== "unplayed" && <StatusIcon state={state} />}
          </div>
          {results ? (
            <ScoreLine results={results} />
          ) : (
            <SubtleHint state={state} unplayedHint={unplayedHint} />
          )}
        </div>
        <Chevron className="shrink-0 text-[color:var(--ink-faint)] group-hover:text-[color:var(--ink-muted)] group-hover:translate-x-[2px] transition-[transform,color] duration-200" />
      </button>

      {/* Inset divider — short and centered so the trophy column doesn't
          read as its own outlined sub-card under the parent's rounded
          corners. */}
      <div
        aria-hidden
        className="self-center w-px h-8 bg-[var(--ink-border-subtle)] shrink-0"
      />
      <button
        type="button"
        onClick={onLeaderboard}
        aria-label="Leaderboard"
        className="inline-flex items-center justify-center px-4 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--ink-whisper)] cursor-pointer bg-transparent border-none transition-colors duration-150"
        style={{ WebkitTapHighlightColor: "transparent", minWidth: 52 }}
      >
        <TrophyIcon size={16} />
      </button>
    </div>
  );
}

function ScoreLine({ results }: { results: DailyRowResults }) {
  return (
    <div
      className="flex items-baseline gap-1.5 min-w-0"
      style={{ animation: "v2-fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <span
        className="text-xl leading-none font-[family-name:var(--font-structure)] tracking-[-0.03em] tabular-nums text-[color:var(--ink)]"
        style={{ fontWeight: 800 }}
      >
        {results.points}
      </span>
      <span
        className="text-caption text-[color:var(--ink-muted)]"
        style={{ fontWeight: 600 }}
      >
        pts
      </span>
      <span
        className="text-caption text-[color:var(--ink-muted)] tabular-nums"
        style={{ fontWeight: 500 }}
      >
        · {results.words}
        {results.totalWords !== undefined ? `/${results.totalWords}` : ""}{" "}
        {results.words === 1 ? "word" : "words"}
      </span>
    </div>
  );
}

function SubtleHint({
  state,
  unplayedHint,
}: {
  state: DailyState;
  unplayedHint: string;
}) {
  const text =
    state === "in-progress" ? "Pick up where you left off" : unplayedHint;
  return (
    <span
      className="text-xs text-[color:var(--ink-soft)] truncate"
      style={{ fontWeight: 500 }}
    >
      {text}
    </span>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
