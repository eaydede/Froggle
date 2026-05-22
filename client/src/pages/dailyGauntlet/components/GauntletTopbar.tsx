import { useState } from 'react';
import { IconAction } from '../../../shared/components/IconAction';
import { DateChip } from '../../../shared/components/DateChip';

// Topbar for the per-round results page. Centers the round chip; the
// right-side info button opens a popover with the round's scoring rule
// so a player landing here from a deep link can re-read the modifier
// without bouncing back to the confirm page.
export function GauntletTopbar({
  label,
  onClose,
  rulePopover,
}: {
  label: string;
  onClose: () => void;
  rulePopover: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="grid items-center gap-2 shrink-0 relative"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div className="flex justify-center min-w-0">
        <DateChip label={label} />
      </div>
      <IconAction onClick={() => setOpen((v) => !v)} label="Scoring rule">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </IconAction>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-20 max-w-[280px] rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-3 py-3">
          <div
            className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] mb-1 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Scoring rule
          </div>
          <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0">{rulePopover}</p>
        </div>
      )}
    </header>
  );
}
