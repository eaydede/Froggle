import { useRef, useEffect, useState, useCallback } from 'react';

export interface RankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  isCurrentUser: boolean;
}

interface RankingsProps {
  entries: RankingEntry[];
  /** Provided only when compare is available (current user has played and
   *  the row isn't themself). Tapping a row calls this with the row's
   *  userId so the host can navigate to the compare page. */
  onCompare?: (userId: string) => void;
}

export function Rankings({ entries, onCompare }: RankingsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const [pillPosition, setPillPosition] = useState<'above' | 'below' | null>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const currentUser = entries.find((e) => e.isCurrentUser);

  const scrollToUser = useCallback(() => {
    userRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    // Auto-scroll to user row on mount
    if (userRowRef.current) {
      userRowRef.current.scrollIntoView({ block: 'center' });
    }
  }, [entries]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      setPillPosition(null);
      setFadeTop(false);
      setFadeBottom(false);
      return;
    }

    const checkState = () => {
      // Fade edges only when there's content hidden in that direction
      setFadeTop(container.scrollTop > 1);
      setFadeBottom(
        container.scrollTop + container.clientHeight < container.scrollHeight - 1,
      );

      // Pill visibility for current user row
      if (!userRowRef.current) {
        setPillPosition(null);
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const rowRect = userRowRef.current.getBoundingClientRect();

      if (rowRect.bottom < containerRect.top) {
        setPillPosition('above');
      } else if (rowRect.top > containerRect.bottom) {
        setPillPosition('below');
      } else {
        setPillPosition(null);
      }
    };

    checkState();
    container.addEventListener('scroll', checkState);
    const resizeObserver = new ResizeObserver(checkState);
    resizeObserver.observe(container);
    return () => {
      container.removeEventListener('scroll', checkState);
      resizeObserver.disconnect();
    };
  }, [entries]);

  const maskImage = (() => {
    const top = fadeTop ? 'transparent' : 'black';
    const bottom = fadeBottom ? 'transparent' : 'black';
    return `linear-gradient(to bottom, ${top}, black 24px, black calc(100% - 24px), ${bottom})`;
  })();

  return (
    <div className="relative flex flex-col" style={{ minHeight: 0, height: '100%' }}>
      {/* Section label */}
      <div
        className="text-[0.65rem] tracking-[0.1em] uppercase mb-2"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-label)', fontWeight: 'var(--font-label-weight)' as any }}
      >
        Rankings
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="relative overflow-y-auto flex-1"
        style={{
          maskImage: maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {entries.map((entry) => {
          const isUser = entry.isCurrentUser;
          const clickable = !!onCompare && !isUser;
          const Comp = clickable ? 'button' : 'div';
          return (
            <Comp
              key={entry.rank}
              ref={isUser ? (userRowRef as never) : undefined}
              onClick={clickable ? () => onCompare!(entry.userId) : undefined}
              className={`flex items-center justify-between w-full py-2.5 px-3 rounded-xl transition-colors duration-150 ${
                clickable
                  ? 'cursor-pointer hover:bg-[var(--track)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
                  : ''
              }`}
              style={{
                backgroundColor: isUser ? 'var(--accent-row-bg, rgba(107,155,125,0.12))' : 'transparent',
                border: isUser ? '1px solid var(--accent-row-border, rgba(107,155,125,0.2))' : '1px solid transparent',
                textAlign: 'left',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[0.8rem] w-6 text-center"
                  style={{ color: isUser ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                >
                  {entry.rank}
                </span>
                <span
                  className="text-[0.85rem]"
                  style={{ color: isUser ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 700 }}
                >
                  {isUser ? 'You' : entry.displayName}
                </span>
              </div>
              <span
                className="text-[0.85rem]"
                style={{ color: isUser ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 700 }}
              >
                {entry.value}
              </span>
            </Comp>
          );
        })}
      </div>

      {/* Floating pill when user row is out of view */}
      {pillPosition && currentUser && (
        <button
          onClick={scrollToUser}
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer border-none transition-all duration-200 hover:scale-105"
          style={{
            ...(pillPosition === 'above' ? { top: '28px' } : { bottom: '0px' }),
            backgroundColor: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.72rem',
            fontWeight: 700,
            boxShadow: '0 2px 12px rgba(107,155,125,0.4)',
          }}
        >
          <span>{pillPosition === 'above' ? '↑' : '↓'}</span>
          <span>You · #{currentUser.rank} · {currentUser.value}</span>
        </button>
      )}
    </div>
  );
}
