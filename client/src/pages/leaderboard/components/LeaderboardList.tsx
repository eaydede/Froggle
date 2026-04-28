import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusIcon } from '../../../shared/components/StatusIcon';

export interface LbListEntry {
  rank: number;
  userId: string;
  displayName: string;
  subLabel: string;
  value: number;
  isCurrentUser: boolean;
  inProgress?: boolean;
}

interface LeaderboardListProps {
  entries: LbListEntry[];
  /** Provided only when tapping an *other* player's row should route to
   *  a comparison (i.e. the current user has played). Missing prop ⇒
   *  other-player rows render non-interactive. */
  onCompare?: (userId: string) => void;
  /** Fires when tapping the current-user row. Typically routes to the
   *  user's own results page. Missing prop ⇒ self-row non-interactive. */
  onSelfClick?: () => void;
}

/** Full continuous rankings list with the mockup row styling. Auto-scrolls
 *  the current user's row into view on mount; when the user scrolls it
 *  out of view, a floating "Back to you" pill appears to recenter. */
export function LeaderboardList({ entries, onCompare, onSelfClick }: LeaderboardListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const youRowRef = useRef<HTMLDivElement>(null);
  const [pillPosition, setPillPosition] = useState<'above' | 'below' | null>(null);

  const you = entries.find((e) => e.isCurrentUser);

  const recenter = useCallback(() => {
    youRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // On mount / entries change: snap the user's row into the middle of
  // the viewport without animation.
  useEffect(() => {
    if (youRowRef.current) {
      youRowRef.current.scrollIntoView({ block: 'center' });
    }
  }, [entries]);

  useEffect(() => {
    const container = scrollRef.current;
    const youRow = youRowRef.current;
    if (!container || !youRow) {
      setPillPosition(null);
      return;
    }

    const recompute = () => {
      const c = container.getBoundingClientRect();
      const r = youRow.getBoundingClientRect();
      if (r.bottom < c.top) setPillPosition('above');
      else if (r.top > c.bottom) setPillPosition('below');
      else setPillPosition(null);
    };

    recompute();
    container.addEventListener('scroll', recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => {
      container.removeEventListener('scroll', recompute);
      ro.disconnect();
    };
  }, [entries]);

  return (
    <div className="relative flex-1 min-h-0 mt-1.5 flex flex-col rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
        }}
      >
        {entries.map((entry, i) => (
          <Row
            key={`${entry.userId}-${entry.rank}`}
            entry={entry}
            first={i === 0}
            rowRef={entry.isCurrentUser ? youRowRef : undefined}
            onCompare={onCompare}
            onSelfClick={onSelfClick}
          />
        ))}
      </div>

      {pillPosition && you && (
        <button
          type="button"
          onClick={recenter}
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer border-none bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)] transition-all duration-200 font-[family-name:var(--font-structure)]"
          style={{
            ...(pillPosition === 'above' ? { top: '12px' } : { bottom: '18px' }),
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span aria-hidden>{pillPosition === 'above' ? '↑' : '↓'}</span>
          <span>
            You · #{you.rank} · {you.value}
          </span>
        </button>
      )}
    </div>
  );
}

function Row({
  entry,
  first,
  rowRef,
  onCompare,
  onSelfClick,
}: {
  entry: LbListEntry;
  first: boolean;
  rowRef?: React.RefObject<HTMLDivElement>;
  onCompare?: (userId: string) => void;
  onSelfClick?: () => void;
}) {
  const handleClick = entry.isCurrentUser
    ? onSelfClick
    : onCompare
      ? () => onCompare(entry.userId)
      : undefined;
  const clickable = !!handleClick;

  const rankClass = entry.isCurrentUser
    ? 'text-[color:var(--compare-you)]'
    : entry.rank === 1
      ? 'text-[color:var(--podium-gold)]'
      : entry.rank === 2
        ? 'text-[color:var(--podium-silver)]'
        : entry.rank === 3
          ? 'text-[color:var(--podium-bronze)]'
          : 'text-[color:var(--ink-soft)]';
  const rankWeight = entry.isCurrentUser || entry.rank <= 3 ? 800 : 700;

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick?.();
              }
            }
          : undefined
      }
      className={[
        'relative grid items-center px-3.5 py-2 gap-2 transition-colors duration-150',
        first ? '' : 'border-t border-[var(--ink-border-subtle)]',
        clickable ? 'cursor-pointer hover:bg-[var(--ink-whisper)]' : '',
        entry.isCurrentUser
          ? 'bg-[var(--you-highlight-bg)] hover:bg-[var(--you-highlight-bg-hi)]'
          : '',
      ].join(' ')}
      style={{ gridTemplateColumns: '28px 1fr auto' }}
    >
      {entry.isCurrentUser && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[2px] bg-[var(--compare-you)]"
        />
      )}
      <span
        className={`text-[13px] tabular-nums font-[family-name:var(--font-structure)] ${rankClass}`}
        style={{ fontWeight: rankWeight }}
      >
        {entry.rank}
      </span>
      <div className="flex flex-col gap-[2px] min-w-0">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-[1.2] text-[color:var(--ink)] truncate"
          style={{
            fontWeight: entry.isCurrentUser ? 600 : 500,
            color: entry.isCurrentUser ? 'var(--compare-you)' : 'var(--ink)',
          }}
        >
          <span className="truncate">{entry.displayName}</span>
          {entry.inProgress && <StatusIcon state="in-progress" />}
          {entry.isCurrentUser && (
            <span
              className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-[var(--compare-you)] text-[color:var(--ink-inverse)] text-[8px] uppercase tracking-[0.08em] flex-shrink-0 font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700, lineHeight: '1.4' }}
            >
              You
            </span>
          )}
        </div>
        <div
          className="text-[9px] tabular-nums text-[color:var(--ink-soft)]"
          style={{ fontWeight: 500 }}
        >
          {entry.subLabel}
        </div>
      </div>
      <span
        className="text-[15px] tabular-nums text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700, letterSpacing: '-0.01em' }}
      >
        {entry.value}
      </span>
    </div>
  );
}
