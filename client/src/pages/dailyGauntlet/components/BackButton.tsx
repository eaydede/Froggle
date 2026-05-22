// Shared back-arrow button used by the gauntlet hub and confirm pages.
// Lives here so both pages reference the same visual instead of each
// shipping their own copy.
export function BackButton({ onClick }: { onClick: () => void }) {
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
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}
