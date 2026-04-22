import { ProfileAvatar } from "./ProfileAvatar";

interface AppHeaderProps {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onCalendarClick: () => void;
}

export function AppHeader({
  displayName,
  onDisplayNameChange,
  onCalendarClick,
}: AppHeaderProps) {
  return (
    <div className="flex justify-between items-center py-[18px] pb-[22px]">
      <button
        type="button"
        onClick={onCalendarClick}
        aria-label="Calendar"
        className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center bg-transparent border-none cursor-pointer text-[color:var(--ink-muted)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200"
        style={{ WebkitTapHighlightColor: "transparent" }}
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
  );
}
