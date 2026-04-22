import { StreakBar } from "./StreakBar";
import { InkButton } from "../../../shared/components/InkButton";
import type { DailyResults } from "../types";

interface DailyCardProps {
  /** Today's display date, already formatted (e.g. "Tue · Apr 21"). */
  dateLabel: string;
  streak: number;
  streakDays: boolean[];
  results: DailyResults | null;
  onPlay: () => void;
  onSeeResult: () => void;
  onSeeLeaderboard: () => void;
}

export function DailyCard({
  dateLabel,
  streak,
  streakDays,
  results,
  onPlay,
  onSeeResult,
  onSeeLeaderboard,
}: DailyCardProps) {
  const completed = results !== null;

  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-[18px]">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Timed Daily
        </span>
        <span
          className="text-caption text-[color:var(--ink-soft)] tabular-nums leading-none"
          style={{ fontWeight: 500 }}
        >
          {dateLabel}
        </span>
      </div>

      <div className="px-5 pt-[14px] pb-5 flex flex-col gap-[14px]">
        <StreakBar streak={streak} days={streakDays} todayUnplayed={!completed} />

        {completed && results ? (
          <>
            <ScoreBlock points={results.points} words={results.words} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={onSeeResult}>See result</SecondaryButton>
              <SecondaryButton onClick={onSeeLeaderboard}>Leaderboard</SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <PrimaryPlayButton onClick={onPlay} />
            <LeaderboardLink onClick={onSeeLeaderboard} />
          </>
        )}
      </div>
    </div>
  );
}

function ScoreBlock({ points, words }: { points: number; words: number }) {
  return (
    <div
      className="flex items-baseline justify-between py-0.5"
      style={{ animation: "v2-fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div className="flex items-baseline gap-[5px]">
        <span
          className="text-display-lg leading-none font-[family-name:var(--font-structure)] tracking-[-0.03em] tabular-nums"
          style={{ fontWeight: 800 }}
        >
          {points}
        </span>
        <span className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 600 }}>
          pts
        </span>
      </div>
      <span className="text-small text-[color:var(--ink-muted)] tabular-nums" style={{ fontWeight: 500 }}>
        {words} {words === 1 ? "word" : "words"}
      </span>
    </div>
  );
}

function PrimaryPlayButton({ onClick }: { onClick: () => void }) {
  return (
    <InkButton onClick={onClick}>
      Play daily
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

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-small text-[color:var(--ink)] bg-transparent border border-[var(--ink-border)] cursor-pointer select-none hover:bg-[var(--ink-whisper)] hover:border-[var(--ink-muted)] active:scale-[0.98] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]"
      style={{ fontWeight: 600, WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
}

function LeaderboardLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-center gap-1.5 text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] bg-transparent border-none cursor-pointer py-1.5 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500 }}
    >
      See today's leaderboard
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-[2px]"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
