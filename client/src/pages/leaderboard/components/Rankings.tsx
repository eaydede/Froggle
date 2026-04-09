import { useRef, useEffect, useState, useCallback } from 'react';

export interface RankingEntry {
  rank: number;
  displayName: string;
  value: number;
  isCurrentUser: boolean;
}

interface RankingsProps {
  entries: RankingEntry[];
}

export function Rankings({ entries }: RankingsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const [pillPosition, setPillPosition] = useState<'above' | 'below' | null>(null);

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
    if (!container || !userRowRef.current) {
      setPillPosition(null);
      return;
    }

    const checkVisibility = () => {
      const containerRect = container.getBoundingClientRect();
      const rowRect = userRowRef.current!.getBoundingClientRect();

      if (rowRect.bottom < containerRect.top) {
        setPillPosition('above');
      } else if (rowRect.top > containerRect.bottom) {
        setPillPosition('below');
      } else {
        setPillPosition(null);
      }
    };

    checkVisibility();
    container.addEventListener('scroll', checkVisibility);
    return () => container.removeEventListener('scroll', checkVisibility);
  }, [entries]);

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
          maskImage:
            'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
        }}
      >
        {entries.map((entry) => {
          const isUser = entry.isCurrentUser;
          return (
            <div
              key={entry.rank}
              ref={isUser ? userRowRef : undefined}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-150"
              style={{
                backgroundColor: isUser ? 'var(--accent-row-bg, rgba(107,155,125,0.12))' : 'transparent',
                border: isUser ? '1px solid var(--accent-row-border, rgba(107,155,125,0.2))' : '1px solid transparent',
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
            </div>
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
