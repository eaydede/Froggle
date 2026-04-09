export interface PlayerCardProps {
  points: number;
  wordsFound: number;
  longestWord: string;
  rank: number;
  totalPlayers: number;
  topPercent: number | null;
  accolade: string;
}

export function PlayerCard({
  points,
  wordsFound,
  longestWord,
  rank,
  totalPlayers,
  topPercent,
  accolade,
}: PlayerCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--accent)',
        color: '#fff',
        boxShadow: '0 4px 24px rgba(107,155,125,0.30)',
      }}
    >
      {/* Main content: stats left, rank right */}
      <div
        className="flex"
        style={{ padding: '1rem 1.25rem 0.75rem' }}
      >
        {/* Left — personal stats */}
        <div className="flex-1">
          {/* Points hero */}
          <div className="flex items-baseline" style={{ gap: '6px' }}>
            <span
              style={{
                fontSize: '2.2rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {points}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                opacity: 0.7,
              }}
            >
              pts
            </span>
          </div>

          {/* Words + Longest */}
          <div
            style={{
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '2px 8px',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                opacity: 0.7,
              }}
            >
              Words
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
              }}
            >
              {wordsFound}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                opacity: 0.7,
              }}
            >
              Longest
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {longestWord}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            alignSelf: 'stretch',
            backgroundColor: 'rgba(255,255,255,0.2)',
            margin: '0 1rem',
          }}
        />

        {/* Right — rank context */}
        <div
          className="flex flex-col items-center justify-center"
          style={{ minWidth: '80px' }}
        >
          <span
            style={{
              fontSize: '1.75rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 'var(--font-heading-weight)' as any,
              lineHeight: 1,
            }}
          >
            #{rank}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              opacity: 0.65,
              marginTop: '4px',
            }}
          >
            {totalPlayers} played
          </span>
          {topPercent !== null && (
            <span
              className="rounded-full"
              style={{
                marginTop: '6px',
                fontSize: '0.6rem',
                fontFamily: 'var(--font-label)',
                fontWeight: 'var(--font-label-weight)' as any,
                padding: '3px 10px',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              Top {topPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Accolade bar */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.15)',
          padding: '0.5rem 1.25rem',
        }}
      >
        <div className="flex items-center" style={{ gap: '6px' }}>
          <span style={{ fontSize: '0.8rem' }}>⭐</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              opacity: 0.85,
            }}
            dangerouslySetInnerHTML={{ __html: accolade }}
          />
        </div>
      </div>
    </div>
  );
}
