export interface TopThreeEntry {
  rank: 1 | 2 | 3;
  displayName: string;
  value: number;
  unit: string;
}

interface TopThreeProps {
  entries: TopThreeEntry[];
}

const MEDAL_COLORS: Record<1 | 2 | 3, { bg: string; text: string; glow: string }> = {
  1: { bg: '#e1af2f', text: '#fff', glow: 'rgba(225, 175, 47, 0.3)' },
  2: { bg: '#8E8E93', text: '#fff', glow: 'rgba(142, 142, 147, 0.25)' },
  3: { bg: '#A0714F', text: '#fff', glow: 'rgba(160, 113, 79, 0.25)' },
};

const MEDAL_LABELS: Record<1 | 2 | 3, string> = {
  1: '1ST',
  2: '2ND',
  3: '3RD',
};

export function TopThree({ entries }: TopThreeProps) {
  return (
    <div>
      <div
        className="text-[0.65rem] tracking-[0.1em] uppercase mb-2"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-label)', fontWeight: 'var(--font-label-weight)' as any }}
      >
        Top 3
      </div>
      <div className="flex" style={{ gap: '0.5rem', paddingTop: '0.75rem' }}>
      {entries.map((entry) => {
        const medal = MEDAL_COLORS[entry.rank];
        return (
          <div
            key={entry.rank}
            className="relative flex-1 flex flex-col items-center rounded-xl"
            style={{
              padding: '1.25rem 0.75rem 0.75rem',
              gap: '2px',
              backgroundColor: 'var(--card)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            {/* Medal badge — overlaps top edge */}
            <span
              style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontFamily: 'var(--font-label)',
                fontWeight: 'var(--font-label-weight)' as any,
                backgroundColor: medal.bg,
                color: medal.text,
                boxShadow: `0 0 8px ${medal.glow}`,
              }}
            >
              {MEDAL_LABELS[entry.rank]}
            </span>

            {/* Value + unit */}
            <div className="flex items-baseline" style={{ gap: '3px' }}>
              <span
                className="text-[1.25rem]"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 'var(--font-label-weight)', color: 'var(--text)' }}
              >
                {entry.value}
              </span>
              <span
                className="text-[0.7rem]"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--text-muted)' }}
              >
                {entry.unit}
              </span>
            </div>

            {/* Name */}
            <span
              className="text-[0.75rem]"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--text-muted)' }}
            >
              {entry.displayName}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}
