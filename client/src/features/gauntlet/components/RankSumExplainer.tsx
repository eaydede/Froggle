import { useState } from 'react';

// Collapsible "How standings work" disclosure on the gauntlet aggregate
// results page. Default-collapsed so it doesn't crowd the rank reveal;
// players who care can expand it.
export function RankSumExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 bg-transparent border-none cursor-pointer text-left hover:bg-[var(--ink-whisper)] transition-colors duration-150 font-[family-name:var(--font-ui)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          How standings work
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[color:var(--ink-faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0 px-3 pb-3">
          Each round is ranked on its own. Your gauntlet score is the sum of your three
          round ranks — lowest wins. Crushing one round and stumbling in another can still
          come out ahead.
        </p>
      )}
    </div>
  );
}
