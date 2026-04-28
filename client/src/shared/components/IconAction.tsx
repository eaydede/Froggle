import type { ReactNode } from 'react';

interface IconActionProps {
  onClick: () => void;
  label: string;
  children: ReactNode;
}

/** Square 32px icon button used in top bars (close, back, share, etc.).
 *  Renders the SVG child at 16x16 with the project's hover/whisper
 *  treatment. */
export function IconAction({ onClick, label, children }: IconActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-transparent border-none cursor-pointer text-[color:var(--ink-soft)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200 [&>svg]:w-4 [&>svg]:h-4"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}
