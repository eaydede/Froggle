export interface LeaderboardTeaserEntry {
  rank: number;
  name: string;
  score: number;
}

interface LeaderboardTeaserProps {
  top: LeaderboardTeaserEntry[];
  you: LeaderboardTeaserEntry | null;
  onClick: () => void;
}

export function LeaderboardTeaser({ top, you, onClick }: LeaderboardTeaserProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col gap-1 rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-3 py-[9px] mt-2 cursor-pointer hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 text-left font-[family-name:var(--font-ui)]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {top.map((e) => (
        <Row key={e.rank} entry={e} />
      ))}
      {you && <YouRow entry={you} />}
      <div
        className="flex items-center justify-center gap-1 pt-1 text-[11px] uppercase tracking-[0.04em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        View full leaderboard
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}

function Row({ entry }: { entry: LeaderboardTeaserEntry }) {
  return (
    <div className="flex justify-between items-center tabular-nums text-xs">
      <span
        className="min-w-6 text-[11px] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700, letterSpacing: '0.02em' }}
      >
        #{entry.rank}
      </span>
      <span className="flex-1 text-[color:var(--ink-muted)] truncate" style={{ fontWeight: 500 }}>
        {entry.name}
      </span>
      <span
        className="text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {entry.score}
      </span>
    </div>
  );
}

function YouRow({ entry }: { entry: LeaderboardTeaserEntry }) {
  return (
    <div className="flex justify-between items-center tabular-nums text-xs py-[5px] border-t border-b border-[var(--ink-border-subtle)]">
      <span
        className="min-w-6 text-[11px] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700, letterSpacing: '0.02em' }}
      >
        #{entry.rank}
      </span>
      <span className="flex-1 text-[color:var(--ink)]" style={{ fontWeight: 700 }}>
        {entry.name}
      </span>
      <span
        className="text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {entry.score}
      </span>
    </div>
  );
}
