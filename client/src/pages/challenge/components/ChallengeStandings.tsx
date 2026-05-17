import type { FreePlayChallengePlayer } from '../../../shared/api/gameApi';

interface ChallengeStandingsProps {
  players: FreePlayChallengePlayer[];
  selectedSessionId: string | null;
  mySessionId: string | null;
  onSelect: (sessionId: string) => void;
  compact?: boolean;
}

export function ChallengeStandings({
  players,
  selectedSessionId,
  mySessionId,
  onSelect,
  compact = false,
}: ChallengeStandingsProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <div
        className="flex justify-between items-center pb-2 uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] leading-none text-[color:var(--ink)] shrink-0"
        style={{
          fontWeight: 700,
          borderBottom: '1px solid var(--ink-trace)',
        }}
      >
        <span>Standings</span>
        <span
          className="tabular-nums text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          {players.length}
        </span>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? 'flex flex-col gap-1 pt-1' : ''}`}
        style={{
          // Cap the standings so word-list area has room to breathe even
          // on five-player challenges; the soft mask makes the cap read
          // as "more below" rather than an abrupt edge.
          maxHeight: '168px',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
        }}
      >
        {players.map((p, i) => {
          const isYou = p.sessionId === mySessionId;
          const isSelected = p.sessionId === selectedSessionId;
          const stripe = isSelected
            ? 'var(--opp-accent)'
            : isYou
              ? 'var(--you-accent)'
              : 'transparent';
          return (
            <button
              key={p.sessionId}
              type="button"
              onClick={isYou ? undefined : () => onSelect(p.sessionId)}
              disabled={isYou}
              className={`relative w-full flex items-center gap-2 text-left transition-colors duration-150 border-none ${compact ? 'rounded-md' : 'border-b border-[var(--ink-border-subtle)] last:border-b-0'}`}
              style={{
                padding: '9px 5px 9px 12px',
                minHeight: '34px',
                cursor: isYou ? 'default' : 'pointer',
                // Selection is signalled purely via the colored left
                // stripe — no row background tint — so the row stays
                // visually quiet next to a clean word list.
                background: compact && isSelected ? 'var(--opp-accent-soft)' : 'transparent',
                WebkitTapHighlightColor: 'transparent',
              }}
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
                style={{ fontWeight: 700, width: '12px' }}
              >
                {i + 1}
              </span>
              <span
                className="truncate text-xs text-[color:var(--ink)] flex-1 min-w-0"
                style={{ fontWeight: isYou || isSelected ? 700 : 600 }}
                title={isYou ? 'You' : p.displayName}
              >
                {isYou ? 'You' : p.displayName}
              </span>
              <span
                className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 text-xs text-[color:var(--ink-muted)]"
                style={{ fontWeight: 700 }}
              >
                {p.points}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
