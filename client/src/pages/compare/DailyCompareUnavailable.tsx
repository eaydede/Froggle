import { InkButton } from '../../shared/components/InkButton';

interface DailyCompareUnavailableProps {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  onBack: () => void;
}

/** Neutral empty/error state used when compare can't render — e.g. the
 *  current user hasn't played yet, or the opponent's result is missing. */
export function DailyCompareUnavailable({
  title,
  body,
  primaryLabel,
  onPrimary,
  onBack,
}: DailyCompareUnavailableProps) {
  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="w-full max-w-[360px] flex flex-col px-[22px] pt-[14px] pb-5">
        <div
          className="grid items-center gap-2.5 pt-3.5"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-transparent border-none cursor-pointer text-[color:var(--ink-soft)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div
            className="text-center text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Comparison
          </div>
          <span aria-hidden />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center gap-4 px-2">
          <div
            className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 500 }}
          >
            {title}
          </div>
          <p className="text-small text-[color:var(--ink-muted)] leading-[1.55] max-w-[280px]">
            {body}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <InkButton onClick={onPrimary}>{primaryLabel}</InkButton>
        </div>
      </div>
    </div>
  );
}
