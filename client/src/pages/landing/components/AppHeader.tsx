import { ProfileAvatar } from "./ProfileAvatar";

interface AppHeaderProps {
  dateLabel: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
}

// Calendar slot is intentionally inert while the hub-style daily page is
// being phased out — clicking it used to route into the daily confirm
// flow, which let mid-play users start a fresh attempt. Left as a
// disabled affordance so the header balance is preserved.
export function AppHeader({ dateLabel, displayName, onDisplayNameChange }: AppHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 pt-[18px] pb-[22px]">
      <div className="w-full flex justify-between items-center">
        <button
          type="button"
          disabled
          aria-label="Calendar (coming soon)"
          aria-disabled="true"
          tabIndex={-1}
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center bg-transparent border-none text-[color:var(--ink-soft)] opacity-50 cursor-not-allowed"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>

        <div
          className="text-logo italic leading-none tracking-[-0.02em] font-[family-name:var(--font-display)]"
          style={{ fontWeight: 600 }}
        >
          Froggle
          <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
        </div>

        <ProfileAvatar displayName={displayName} onSave={onDisplayNameChange} />
      </div>

      <span
        className="text-small uppercase tracking-[0.12em] text-[color:var(--ink-soft)] tabular-nums leading-none font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 600 }}
      >
        {dateLabel}
      </span>
    </div>
  );
}
