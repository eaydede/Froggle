export interface LeaderboardTeaserEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

interface LeaderboardTeaserProps {
  /** Top-of-leaderboard rows, in rank order. If the current user is
   *  among them (e.g. they placed 1st), their row gets the "you"
   *  treatment and `you` below should be null so they don't appear
   *  twice in the card. */
  top: LeaderboardTeaserEntry[];
  /** Separate current-user row rendered under the top rows when the user
   *  isn't in `top`. Pass null when the user already appears above. */
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
        <Row key={`top-${e.rank}`} entry={e} />
      ))}
      {you && <Row entry={{ ...you, isCurrentUser: true }} separated />}
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

function Row({
  entry,
  separated,
}: {
  entry: LeaderboardTeaserEntry;
  /** When true, add horizontal dividers above/below — used for the "you"
   *  row that sits apart from the top rows. */
  separated?: boolean;
}) {
  const you = !!entry.isCurrentUser;
  const nameColor = you ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-muted)]';
  const nameWeight = you ? 700 : 500;
  return (
    <div
      className={[
        'flex items-center gap-2 tabular-nums text-xs',
        separated ? 'py-[5px] border-t border-b border-[var(--ink-border-subtle)]' : '',
      ].join(' ')}
    >
      <span
        className={[
          'shrink-0 min-w-6 text-[11px] font-[family-name:var(--font-structure)]',
          you ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-soft)]',
        ].join(' ')}
        style={{ fontWeight: 700, letterSpacing: '0.02em' }}
      >
        #{entry.rank}
      </span>
      <span className={`flex-1 min-w-0 truncate ${nameColor}`} style={{ fontWeight: nameWeight }}>
        {you ? 'you' : entry.name}
      </span>
      <span
        className="shrink-0 text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {entry.score}
      </span>
    </div>
  );
}
