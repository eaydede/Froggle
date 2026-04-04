type CardMode = 'light' | 'dark';

interface FreePlayCardProps {
  onClick: () => void;
  mode?: CardMode;
}

export function FreePlayCard({ onClick, mode = 'light' }: FreePlayCardProps) {
  const dark = mode === 'dark';

  const bg = dark ? '#3A3A3C' : 'var(--card)';
  const textColor = dark ? '#E5E5E7' : 'var(--text)';
  const subtitleColor = dark ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)';
  const arrowColor = dark ? 'rgba(255,255,255,0.35)' : 'var(--text-muted)';
  const arrowHoverColor = dark ? 'rgba(255,255,255,0.7)' : 'var(--text-mid)';
  const shadow = dark
    ? '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)'
    : '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)';
  const hoverShadow = dark
    ? '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)'
    : '0 0 0 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)';

  return (
    <div
      onClick={onClick}
      className="group rounded-2xl cursor-pointer select-none flex items-center justify-between transition-all duration-200 active:scale-[0.985] active:duration-[60ms] sm:px-6 sm:py-5"
      style={{
        padding: '1.15rem 1.35rem',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: bg,
        boxShadow: shadow,
        color: textColor,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = hoverShadow; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = shadow; }}
    >
      <div>
        <div className="text-[0.95rem] font-bold">Free Play</div>
        <div className="text-[0.68rem] font-medium mt-0.5" style={{ color: subtitleColor }}>
          Pick your own settings
        </div>
      </div>
      <span
        className="text-[0.85rem] transition-all duration-200 group-hover:translate-x-[3px]"
        style={{ color: arrowColor }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = arrowHoverColor; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = arrowColor; }}
      >
        →
      </span>
    </div>
  );
}
