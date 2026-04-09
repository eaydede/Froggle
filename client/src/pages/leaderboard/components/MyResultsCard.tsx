interface MyResultsCardProps {
  onClick: () => void;
}

const shadow = '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)';
const hoverShadow = '0 0 0 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)';

export function MyResultsCard({ onClick }: MyResultsCardProps) {
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl cursor-pointer select-none flex items-center justify-between transition-all duration-200 active:scale-[0.985] active:duration-[60ms]"
      style={{
        padding: '1rem',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: 'var(--card)',
        boxShadow: shadow,
        color: 'var(--text)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = shadow;
      }}
    >
      <div className="text-[0.95rem]" style={{ fontFamily: 'var(--font-label)', fontWeight: 'var(--font-label-weight)' as any }}>My Results</div>
      <span
        className="text-[0.85rem] transition-all duration-200 group-hover:translate-x-[3px]"
        style={{ color: 'var(--text-muted)' }}
      >
        →
      </span>
    </div>
  );
}
