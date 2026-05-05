import { useEffect } from 'react';
import { ZEN_TIERS, getZenTier } from 'models/zenTiers';

interface TierLadderSheetProps {
  open: boolean;
  onClose: () => void;
  points: number;
  maxScore: number;
}

// Bottom sheet revealing the full tier ladder with point thresholds for the
// day's board. Mirrors ExpandedWordsModal in shape — slide-up + scrim,
// drag-handle pill, escape-to-close — so the play HUD's secondary surfaces
// share a single language.
export function TierLadderSheet({ open, onClose, points, maxScore }: TierLadderSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const currentTier = getZenTier(points, maxScore);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={[
          'fixed inset-0 z-[150] bg-black/45 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tier ladder"
        className={[
          'fixed inset-x-0 bottom-0 z-[160] mx-auto w-full max-w-[420px] bg-[var(--surface-card)] rounded-t-[18px] shadow-[0_-4px_24px_rgba(34,32,28,0.18),0_-1px_2px_rgba(34,32,28,0.06)] flex flex-col overflow-hidden transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]',
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        ].join(' ')}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--ink-faint)]" aria-hidden />
        </div>
        <div className="flex justify-end px-3 pb-1.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors duration-150"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center px-[22px] pb-3 border-b border-[var(--ink-border-subtle)] shrink-0">
          <div
            className="italic leading-none tracking-[-0.02em] text-[28px] text-[color:var(--ink)] font-[family-name:var(--font-display)] mb-2"
            style={{ fontWeight: 600 }}
          >
            Tier ladder
          </div>
          <div
            className="text-[12px] text-[color:var(--ink-muted)]"
            style={{ fontWeight: 500 }}
          >
            <span className="tabular-nums">{points}</span> of <span className="tabular-nums">{maxScore}</span> possible points today
          </div>
        </div>

        <div className="px-[22px] py-3 flex flex-col gap-2">
          {ZEN_TIERS.map((tier) => {
            const threshold = Math.ceil(tier.threshold * maxScore);
            const reached = points >= threshold;
            const isCurrent = currentTier?.id === tier.id;
            const remaining = Math.max(0, threshold - points);
            return (
              <div
                key={tier.id}
                className={[
                  'flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 border transition-colors duration-150',
                  isCurrent
                    ? 'bg-[var(--ink-whisper)] border-[var(--ink-border)]'
                    : 'bg-[var(--surface-panel)] border-[var(--ink-border-subtle)]',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `var(${tier.colorToken})`,
                    opacity: reached ? 1 : 0.35,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14px] leading-tight text-[color:var(--ink)] font-[family-name:var(--font-ui)]"
                    style={{ fontWeight: isCurrent ? 700 : 600 }}
                  >
                    {tier.name}
                  </div>
                  <div
                    className="text-[11px] leading-tight text-[color:var(--ink-soft)] mt-0.5 tabular-nums"
                    style={{ fontWeight: 500 }}
                  >
                    {threshold} pts
                    {!reached && remaining > 0 && (
                      <span className="ml-2 text-[color:var(--ink-muted)]">
                        +{remaining} to go
                      </span>
                    )}
                  </div>
                </div>
                {isCurrent && (
                  <span
                    className="text-[9px] uppercase tracking-[0.12em] leading-none px-1.5 py-1 rounded-full bg-[var(--ink)] text-[color:var(--ink-inverse)] font-[family-name:var(--font-structure)] shrink-0"
                    style={{ fontWeight: 700 }}
                  >
                    You
                  </span>
                )}
                {reached && !isCurrent && (
                  <CheckIcon />
                )}
              </div>
            );
          })}
        </div>

        <div
          className="px-[22px] pb-4 pt-0 text-[11px] text-center text-[color:var(--ink-soft)] leading-[1.5]"
          style={{ fontWeight: 500 }}
        >
          Tiers scale with each board's word count, so the climb feels the same day to day even when point ceilings shift.
        </div>
      </div>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[color:var(--ink-soft)] shrink-0"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
