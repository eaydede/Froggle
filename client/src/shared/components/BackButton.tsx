interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

// Standard back affordance: small muted label + chevron that slides on
// hover. Used by Game Config, multiplayer lobby, and anywhere else a
// route needs a "return to previous page" entry to read the same as the
// rest of the app.
export function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:-translate-x-[2px]"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
