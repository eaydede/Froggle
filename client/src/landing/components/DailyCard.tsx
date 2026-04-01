import type { DailyPuzzleConfig, DailyResults } from "../types";

function formatTimer(seconds: number): string {
  if (!isFinite(seconds)) return "∞";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface DailyCardProps {
  config: DailyPuzzleConfig;
  results: DailyResults | null;
  onClick: () => void;
}

export function DailyCard({ config, results, onClick }: DailyCardProps) {
  const completed = results !== null;

  return (
    <div
      onClick={onClick}
      className={`
        daily-card
        rounded-2xl relative overflow-hidden select-none
        transition-all duration-200
        ${
          completed
            ? "bg-[var(--card)] text-[var(--text)] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_4px_24px_rgba(0,0,0,0.06)] cursor-pointer"
            : "bg-[var(--text)] text-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] cursor-pointer"
        }
        sm:p-6
      `}
      style={{
        padding: "1.35rem",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Watermark puzzle number */}
      <span
        className="absolute top-4 right-5 text-[2rem] font-bold leading-none tracking-[-0.03em] opacity-15"
        style={{ color: completed ? "var(--text)" : "white" }}
      >
        #{config.puzzleNumber}
      </span>

      {/* Title area */}
      <div className="mb-3">
        <div className="text-[0.95rem] font-bold">
          {completed
            ? `Daily Puzzle #${config.puzzleNumber}`
            : "Daily Puzzle"}
        </div>
        <div
          className="text-[0.68rem] font-medium mt-0.5"
          style={{
            color: completed ? "var(--text-muted)" : "rgba(255,255,255,0.5)",
          }}
        >
          {completed ? "Completed today" : "A new board every day"}
        </div>
      </div>

      {/* Playable: show config tags */}
      {!completed && (
        <div className="flex gap-1.5 flex-wrap">
          <ConfigTag label={`${config.boardSize}×${config.boardSize}`} />
          <ConfigTag label={formatTimer(config.timer)} />
          <ConfigTag label={`${config.minWordLength}+ letters`} />
        </div>
      )}

      {/* Completed: show results */}
      {completed && (
        <div className="flex gap-1.5">
          <ResultBox value={String(results.words)} label="Words" shrinkable />
          <ResultBox value={String(results.points)} label="Points" shrinkable />
          <ResultBox value={results.longestWord} label="Longest" />
        </div>
      )}
    </div>
  );
}

function ConfigTag({ label }: { label: string }) {
  return (
    <span
      className="text-[0.6rem] font-semibold rounded-md"
      style={{
        padding: "0.22rem 0.5rem",
        background: "rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      {label}
    </span>
  );
}

function ResultBox({ value, label, shrinkable }: { value: string; label: string; shrinkable?: boolean }) {
  return (
    <div
      className={`rounded-[10px] bg-[var(--track)] text-center ${
        shrinkable ? "flex-1 min-w-0" : "flex-1 shrink-0"
      }`}
      style={{ padding: shrinkable ? "0.55rem 0.3rem" : "0.55rem 0.75rem" }}
    >
      <div className="text-[1rem] font-bold leading-[1.1] text-[var(--text)] truncate">
        {value}
      </div>
      <div className="text-[0.48rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.04em] mt-0.5">
        {label}
      </div>
    </div>
  );
}
