interface FreePlayCardProps {
  onClick: () => void;
}

// Free Play sits below the dailies as a visually distinct option — same
// solid card structure as the dailies (so it looks like a real, completed
// feature, not a placeholder), but flatter (no shadow, ink-whisper fill)
// and led by a sliders glyph instead of a mode avatar so it reads as a
// customisation tool, not a daily puzzle. A thin rule above it makes the
// grouping break with the dailies explicit.
export function FreePlayCard({ onClick }: FreePlayCardProps) {
  return (
    <>
      <div
        className="h-px bg-[var(--ink-border-subtle)] mt-1 mx-1"
        aria-hidden
      />
      <button
        type="button"
        onClick={onClick}
        aria-label="Free play"
        className="group flex items-center gap-3 w-full rounded-2xl px-4 py-[12px] bg-[var(--ink-whisper)] border border-[var(--ink-border-subtle)] cursor-pointer select-none text-left hover:bg-[var(--ink-trace)] hover:border-[var(--ink-border)] active:scale-[0.99] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]"
        style={{ WebkitTapHighlightColor: "transparent", minHeight: 56 }}
      >
        <SlidersGlyph />
        <span className="flex flex-col gap-[2px] flex-1 min-w-0">
          <span
            className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Free Play
          </span>
          <span
            className="text-xs leading-[1.3] text-[color:var(--ink-soft)]"
            style={{ fontWeight: 500 }}
          >
            Custom board, time, and letters
          </span>
        </span>
        <Chevron />
      </button>
    </>
  );
}

function SlidersGlyph() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full shrink-0 bg-[var(--ink-trace)] text-[color:var(--ink-muted)]"
      style={{ width: 32, height: 32 }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="9" cy="7" r="2" fill="var(--ink-whisper)" />
        <circle cx="15" cy="12" r="2" fill="var(--ink-whisper)" />
        <circle cx="7" cy="17" r="2" fill="var(--ink-whisper)" />
      </svg>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-[color:var(--ink-faint)] group-hover:text-[color:var(--ink-muted)] group-hover:translate-x-[2px] transition-[transform,color] duration-200"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
