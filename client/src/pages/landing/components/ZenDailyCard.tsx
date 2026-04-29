import { useEffect, useState } from "react";
import { InkButton } from "../../../shared/components/InkButton";
import { StatusIcon } from "../../../shared/components/StatusIcon";
import { RankBadge, type PodiumRank } from "./RankBadge";
import type { DailyZenSession } from "../../../shared/api/gameApi";

interface ZenDailyCardProps {
  session: DailyZenSession | null;
  config: { boardSize: number; minWordLength: number };
  /** Player's rank on today's zen leaderboard. Only the top-3 are surfaced as a badge. */
  rank?: number | null;
  onPlay: () => void;
  onResume: () => void;
  onSeeResult: () => void;
  onSeeLeaderboard: () => void;
}

type CardState = 'unplayed' | 'in-progress' | 'ended';

function deriveState(session: DailyZenSession | null): CardState {
  if (!session) return 'unplayed';
  if (session.ended_at) return 'ended';
  return 'in-progress';
}

export function ZenDailyCard({
  session,
  config,
  rank,
  onPlay,
  onResume,
  onSeeResult,
  onSeeLeaderboard,
}: ZenDailyCardProps) {
  const state = deriveState(session);
  const podiumRank: PodiumRank | null =
    state === 'ended' && (rank === 1 || rank === 2 || rank === 3) ? rank : null;

  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-[18px]">
        <div className="flex items-center gap-1.5">
          <StatusIcon state={state === 'ended' ? 'completed' : state} />
          <span
            className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Zen Daily
          </span>
          {podiumRank && <RankBadge rank={podiumRank} />}
        </div>
      </div>

      <div className="px-5 py-3 flex flex-col gap-[10px]">
        {state === 'ended' && session && (
          <>
            <ScoreBlock
              words={session.word_count}
              totalWords={session.total_findable}
              points={session.points}
              longestWord={session.longest_word}
            />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={onSeeResult}>See result</SecondaryButton>
              <SecondaryButton onClick={onSeeLeaderboard}>Leaderboard</SecondaryButton>
            </div>
            <NextDailyCountdown />
          </>
        )}

        {state === 'in-progress' && session && (
          <>
            <ScoreBlock
              words={session.word_count}
              points={session.points}
              longestWord={session.longest_word}
            />
            <PrimaryButton onClick={onResume} label="Resume" />
            <LeaderboardLink onClick={onSeeLeaderboard} />
          </>
        )}

        {state === 'unplayed' && (
          <>
            <PrimaryButton onClick={onPlay} label="Play zen" />
            <LeaderboardLink onClick={onSeeLeaderboard} />
          </>
        )}
      </div>
    </div>
  );
}

function ScoreBlock({
  words,
  totalWords,
  points,
  longestWord,
}: {
  words: number;
  totalWords?: number;
  points: number;
  longestWord?: string;
}) {
  return (
    <div className="flex items-end justify-between py-0.5" style={{ animation: "v2-fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <div className="flex items-baseline gap-[5px]">
        <span
          className="text-display-lg leading-none font-[family-name:var(--font-structure)] tracking-[-0.03em] tabular-nums"
          style={{ fontWeight: 800 }}
        >
          {words}
          {totalWords !== undefined && (
            <span
              className="text-logo text-[color:var(--ink-muted)]"
              style={{ fontWeight: 600 }}
            >
              /{totalWords}
            </span>
          )}
        </span>
        <span className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 600 }}>
          {words === 1 ? "word" : "words"}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 leading-tight min-w-0">
        <span
          className="text-small text-[color:var(--ink-muted)] tabular-nums"
          style={{ fontWeight: 500 }}
        >
          {points} pts
        </span>
        {longestWord && (
          <span
            className="text-small uppercase tracking-[0.04em] text-[color:var(--ink)] truncate max-w-[140px] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
            title={longestWord}
          >
            {longestWord}
          </span>
        )}
      </div>
    </div>
  );
}

function NextDailyCountdown() {
  const [msLeft, setMsLeft] = useState(msUntilNextDailyPST);
  useEffect(() => {
    const id = setInterval(() => setMsLeft(msUntilNextDailyPST()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-center gap-[5px] text-[11px] text-[color:var(--ink-soft)] tabular-nums font-[family-name:var(--font-ui)] -mt-0.5"
      style={{ fontWeight: 500 }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="opacity-80"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Next daily in {formatCountdown(msLeft)}
    </div>
  );
}

function msUntilNextDailyPST(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  const s = Number(parts.find((p) => p.type === 'second')!.value);
  return Math.max(0, (24 * 3600 - (h * 3600 + m * 60 + s)) * 1000);
}

function formatCountdown(ms: number): string {
  const totalS = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function PrimaryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <InkButton onClick={onClick}>
      {label}
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
      className="group flex items-center justify-center gap-1.5 text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] bg-transparent border-none cursor-pointer font-[family-name:var(--font-ui)] transition-colors duration-200"
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
