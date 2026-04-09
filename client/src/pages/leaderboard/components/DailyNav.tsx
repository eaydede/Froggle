import { useState, useRef, useEffect } from 'react';

export interface DailyNavEntry {
  date: string;
  puzzleNumber: number;
  points: number;
  wordsFound: number;
  rank: number;
  isToday: boolean;
}

interface DailyNavProps {
  entries: DailyNavEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasNext: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DailyNav({
  entries,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
  hasNext,
}: DailyNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = entries.find((e) => e.date === selectedDate);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative flex items-center justify-center" style={{ gap: '12px' }}>
      {/* Prev arrow */}
      <button
        onClick={onPrev}
        className="border-none bg-transparent cursor-pointer flex items-center justify-center"
        style={{
          fontSize: '1rem',
          color: 'var(--text-muted)',
          padding: '4px',
        }}
      >
        ‹
      </button>

      {/* Date label — toggles dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="border-none bg-transparent cursor-pointer flex items-center"
          style={{
            gap: '6px',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: 'var(--text)',
            padding: '4px 8px',
          }}
        >
          <span>{formatDate(selectedDate)}</span>
          {selected?.isToday && (
            <span
              className="rounded"
              style={{
                fontSize: '0.55rem',
                fontFamily: 'var(--font-label)',
                fontWeight: 'var(--font-label-weight)' as any,
                padding: '2px 8px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Today
            </span>
          )}
          <span
            style={{
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </button>

        {/* Dropdown overlay */}
        {isOpen && (
          <div
            className="absolute left-1/2 rounded-xl overflow-hidden"
            style={{
              top: 'calc(100% + 8px)',
              transform: 'translateX(-50%)',
              width: '300px',
              maxHeight: '280px',
              overflowY: 'auto',
              backgroundColor: 'var(--card)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              zIndex: 50,
            }}
          >
            {entries.map((entry, i) => {
              const isSelected = entry.date === selectedDate;
              return (
                <button
                  key={entry.date}
                  onClick={() => {
                    onSelectDate(entry.date);
                    setIsOpen(false);
                  }}
                  className="w-full border-none bg-transparent cursor-pointer text-left flex items-center justify-between"
                  style={{
                    padding: '12px 16px',
                    borderTop: i > 0 ? '1px solid var(--track)' : 'none',
                    backgroundColor: isSelected ? 'var(--track)' : 'transparent',
                  }}
                >
                  <div>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-body)',
                          fontWeight: 700,
                          color: isSelected ? 'var(--accent)' : 'var(--text)',
                        }}
                      >
                        #{entry.puzzleNumber} · {entry.isToday ? 'Today' : formatShortDate(entry.date)}
                      </span>
                      {entry.isToday && (
                        <span
                          className="rounded"
                          style={{
                            fontSize: '0.5rem',
                            fontFamily: 'var(--font-label)',
                            fontWeight: 'var(--font-label-weight)' as any,
                            padding: '2px 6px',
                            backgroundColor: 'var(--accent)',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Today
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {entry.points} pts · {entry.wordsFound} words
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '1rem',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      color: isSelected ? 'var(--accent)' : 'var(--text-mid)',
                    }}
                  >
                    #{entry.rank}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next arrow */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="border-none bg-transparent cursor-pointer flex items-center justify-center"
        style={{
          fontSize: '1rem',
          color: hasNext ? 'var(--text-muted)' : 'var(--track)',
          padding: '4px',
        }}
      >
        ›
      </button>
    </div>
  );
}
