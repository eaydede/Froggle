import { InkButton } from "../../shared/components/InkButton";

interface DailyConfirmPageProps {
  dateLabel: string;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  playersCount: number | null;
  onStart: () => void;
  onBack: () => void;
  /** When the user has already completed today's daily, swap the Start
   *  button for a See result affordance and disable the replay path. */
  alreadyPlayed?: boolean;
  onSeeResult?: () => void;
}

function formatTimer(seconds: number): string {
  if (!isFinite(seconds)) return "∞";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DailyConfirmPage({
  dateLabel,
  boardSize,
  timeLimit,
  minWordLength,
  playersCount,
  onStart,
  onBack,
  alreadyPlayed = false,
  onSeeResult,
}: DailyConfirmPageProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="flex items-center pt-[18px]">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex-1 flex flex-col justify-center gap-[26px] px-1">
          <Hero dateLabel={dateLabel} alreadyPlayed={alreadyPlayed} />
          <ConfigCard boardSize={boardSize} timeLimit={timeLimit} minWordLength={minWordLength} />
          <p className="text-small text-[color:var(--ink-muted)] text-center leading-[1.5]">
            {alreadyPlayed
              ? "You've already played today. Come back tomorrow for a fresh puzzle."
              : 'One attempt only. Timer starts when you tap start.'}
          </p>
          <div className="flex flex-col gap-1">
            {alreadyPlayed ? (
              <SeeResultButton onClick={onSeeResult ?? onBack} />
            ) : (
              <StartButton onClick={onStart} />
            )}
            <PlayersCount count={playersCount} />
            <button
              type="button"
              onClick={onBack}
              className="bg-transparent border-none py-3 text-small text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] cursor-pointer text-center transition-colors duration-200 font-[family-name:var(--font-ui)]"
              style={{ fontWeight: 500, WebkitTapHighlightColor: "transparent" }}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500, WebkitTapHighlightColor: "transparent" }}
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
        className="transition-transform duration-200 group-hover:-translate-x-[2px]"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}

function Hero({ dateLabel, alreadyPlayed }: { dateLabel: string; alreadyPlayed: boolean }) {
  return (
    <div className="text-center">
      <div
        className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-3 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {dateLabel}
      </div>
      <div
        className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
        style={{ fontWeight: 500 }}
      >
        {alreadyPlayed ? 'Already played.' : 'Ready to play?'}
      </div>
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
      <div className="pt-[14px] px-[18px] text-center">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Today's Config
        </span>
      </div>
      <div className="grid grid-cols-3 px-3 pt-3 pb-4">
        <ConfigItem label="Board" value={`${boardSize}×${boardSize}`} divider />
        <ConfigItem label="Time" value={formatTimer(timeLimit)} divider />
        <ConfigItem label="Letters" value={String(minWordLength)} />
      </div>
    </div>
  );
}

function ConfigItem({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
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

function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <InkButton onClick={onClick}>
      Start
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-[3px]"
      >
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </InkButton>
  );
}

function SeeResultButton({ onClick }: { onClick: () => void }) {
  return (
    <InkButton onClick={onClick}>
      See result
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-[3px]"
      >
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </InkButton>
  );
}

function PlayersCount({ count }: { count: number | null }) {
  if (count === null || count <= 0) return <div className="h-2" aria-hidden />;
  return (
    <div
      className="text-center mt-2 text-xs text-[color:var(--ink-soft)] tabular-nums"
      style={{ fontWeight: 500 }}
    >
      <span
        className="font-[family-name:var(--font-structure)] text-[color:var(--ink-muted)] tracking-[-0.01em]"
        style={{ fontWeight: 700 }}
      >
        {count.toLocaleString()}
      </span>{" "}
      {count === 1 ? "has" : "have"} played today
    </div>
  );
}
