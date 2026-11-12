import type { ReactNode } from 'react';

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  /** Slot for the leading icon — keeps each call site responsible for
   *  the SVG markup so labels and icons stay paired at the use site. */
  icon: ReactNode;
  /** Primary buttons take the high-contrast ink fill; secondaries get
   *  the muted surface. Pair them as a 2-column row (`grid-cols-2 gap-2`)
   *  with the primary on the right. */
  primary?: boolean;
}

export function ActionButton({ onClick, label, icon, primary = false }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-12 rounded-xl border-none flex items-center justify-center gap-2 cursor-pointer select-none transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] font-[family-name:var(--font-ui)]',
        primary
          ? 'bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)]'
          : 'bg-[var(--ink-whisper)] text-[color:var(--ink-muted)] hover:bg-[var(--ink-trace)] hover:text-[color:var(--ink)]',
      ].join(' ')}
      style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
