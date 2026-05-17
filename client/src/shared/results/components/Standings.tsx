import type { ResultsRosterEntry } from '../types';

interface StandingsProps {
  rows: ResultsRosterEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Header label — "Standings" for free-play challenges, "Leaderboard"
   *  for daily/zen. The right-hand counter always shows row count. */
  header: string;
  compact?: boolean;
  /** Cap the visible height; rest scrolls behind a soft mask. */
  maxHeight?: string;
}

export function Standings({
  rows,
  selectedId,
  onSelect,
  header,
  compact = false,
  maxHeight = '190px',
}: StandingsProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <div
        className="flex justify-between items-center pb-2 uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] leading-none text-[color:var(--ink)] shrink-0"
        style={{ fontWeight: 700, borderBottom: '1px solid var(--ink-trace)' }}
      >
        <span>{header}</span>
        <span
          className="tabular-nums text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          {rows.length}
        </span>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? 'flex flex-col gap-1 pt-1' : 'pt-1'}`}
        style={{
          maxHeight,
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
        }}
      >
        {rows.map((row) => {
          const isSelected = row.id === selectedId;
          const stripe = isSelected
            ? 'var(--opp-accent)'
            : row.isYou
              ? 'var(--you-accent)'
              : rankColor(row.rank);
          const background = row.isYou
            ? 'var(--you-accent-soft)'
            : isSelected
              ? 'var(--opp-accent-soft)'
              : 'transparent';
          return (
            <button
              key={row.id}
              type="button"
              onClick={row.isYou ? undefined : () => onSelect(row.id)}
              disabled={row.isYou}
              className="relative w-full flex items-center gap-2 rounded-md border-0 text-left transition-colors duration-150"
              style={{
                padding: '9px 5px 9px 12px',
                minHeight: '34px',
                cursor: row.isYou ? 'default' : 'pointer',
                background,
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label={
                row.isYou ? 'Your result' : `Compare with ${row.displayName}`
              }
            >
              <span
                aria-hidden
                className="absolute left-0"
                style={{
                  top: '6px',
                  bottom: '6px',
                  width: '3px',
                  borderRadius: '0 2px 2px 0',
                  background: stripe,
                }}
              />
              <span
                className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 text-label-xs text-[color:var(--ink-soft)]"
                style={{ fontWeight: 700, width: '16px' }}
              >
                {row.rank}
              </span>
              <span
                className="truncate text-xs text-[color:var(--ink)] flex-1 min-w-0"
                style={{ fontWeight: row.isYou || isSelected ? 700 : 600 }}
                title={row.isYou ? 'You' : row.displayName}
              >
                {row.isYou ? 'You' : row.displayName}
              </span>
              <span
                className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 text-xs text-[color:var(--ink-muted)]"
                style={{ fontWeight: 700 }}
              >
                {row.points}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function rankColor(rank: number): string {
  if (rank === 1) return 'var(--podium-gold)';
  if (rank === 2) return 'var(--podium-silver)';
  if (rank === 3) return 'var(--podium-bronze)';
  return 'transparent';
}
