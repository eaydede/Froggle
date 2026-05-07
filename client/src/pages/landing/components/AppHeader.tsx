import { ChangelogControl } from "./ChangelogControl";
import { ProfileAvatar } from "./ProfileAvatar";
import type { ProfileResponse, UpdateProfileResult } from "../../../shared/api/gameApi";

interface AppHeaderProps {
  dateLabel: string;
  displayName: string;
  nameProfile: ProfileResponse | null;
  onDisplayNameChange: (name: string) => Promise<UpdateProfileResult>;
}

export function AppHeader({ dateLabel, displayName, nameProfile, onDisplayNameChange }: AppHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 pt-[18px] pb-[22px]">
      <div className="w-full flex justify-between items-center">
        <ChangelogControl />

        <div
          className="text-logo italic leading-none tracking-[-0.02em] font-[family-name:var(--font-display)]"
          style={{ fontWeight: 600 }}
        >
          Froggle
          <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
        </div>

        <ProfileAvatar
          displayName={displayName}
          nameProfile={nameProfile}
          onSave={onDisplayNameChange}
        />
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
