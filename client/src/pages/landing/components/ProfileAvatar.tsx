import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ProfileResponse, UpdateProfileResult } from "../../../shared/api/gameApi";

interface ProfileAvatarProps {
  displayName: string;
  nameProfile: ProfileResponse | null;
  onSave: (name: string) => Promise<UpdateProfileResult>;
}

const MARK_EMOJI = "🤡";

function formatRelativeRemaining(iso: string | null): string {
  if (!iso) return "soon";
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `for ${hours}h`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `for ${minutes}m`;
}

function MaskName({ name }: { name: string }) {
  return (
    <span className="font-semibold text-[color:var(--accent-warning)]">{name}</span>
  );
}

function maskMessage(profile: ProfileResponse): ReactNode {
  if (profile.is_locked) {
    return (
      <>
        Locked to <MaskName name={profile.public_name} /> {formatRelativeRemaining(profile.locked_until)} after 3 flagged tries.
      </>
    );
  }
  if (profile.strikes >= 2) {
    return (
      <>
        Flagged again — others see <MaskName name={profile.public_name} />. One more locks your name for 24h with a 🤡.
      </>
    );
  }
  return (
    <>
      Flagged — others see <MaskName name={profile.public_name} />. Pick a new name to clear it.
    </>
  );
}

export function ProfileAvatar({ displayName, nameProfile, onSave }: ProfileAvatarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isMarked = nameProfile?.is_marked ?? false;
  const isLocked = nameProfile?.is_locked ?? false;

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!tooltipOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tooltipOpen]);

  const handleOpen = () => {
    setDraft(displayName);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (isLocked) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      return;
    }
    const result = await onSave(trimmed);
    if (result.ok) {
      setError(null);
      setEditing(false);
    } else if (result.reason === "locked") {
      setError(`Name editing is locked ${formatRelativeRemaining(result.lockedUntil)}.`);
    } else {
      setError("Couldn't update name. Try again.");
    }
  };

  const handleCancel = () => {
    setDraft(displayName);
    setError(null);
    setEditing(false);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Profile"
        className="w-[34px] h-[34px] rounded-[10px] bg-transparent border border-[var(--ink-border)] flex items-center justify-center text-small text-[color:var(--ink)] cursor-pointer font-[family-name:var(--font-ui)]"
        style={{ fontWeight: 600, WebkitTapHighlightColor: "transparent" }}
      >
        {initial}
      </button>

      {isMarked && nameProfile && isLocked && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTooltipOpen((v) => !v);
          }}
          aria-label="Why your name is masked"
          className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[var(--surface-card)] border border-[var(--ink-border)] flex items-center justify-center text-[10px] cursor-pointer leading-none p-0"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {MARK_EMOJI}
        </button>
      )}

      {isMarked && nameProfile && !isLocked && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTooltipOpen((v) => !v);
          }}
          aria-label="Why your name is hidden"
          className="absolute -top-1 -right-1 w-[10px] h-[10px] rounded-full bg-[var(--accent-warning)] border border-[var(--surface-panel)] cursor-pointer p-0"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />
      )}

      {tooltipOpen && nameProfile && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="absolute top-full right-0 mt-2 w-[240px] rounded-xl p-3 bg-[var(--surface-card)] shadow-[var(--shadow-card)] border border-[var(--ink-border-subtle)] text-small text-[color:var(--ink)] font-[family-name:var(--font-ui)] z-[110] leading-snug"
          style={{ fontWeight: 500 }}
        >
          {maskMessage(nameProfile)}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-6"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl p-6 flex flex-col gap-4 bg-[var(--surface-card)] shadow-[var(--shadow-card)] font-[family-name:var(--font-ui)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-center text-[color:var(--ink)]" style={{ fontWeight: 600 }}>
              Display name
            </div>

            {nameProfile && isMarked && (
              <div
                className="rounded-xl px-3 py-2 bg-[var(--surface-panel)] border border-[var(--ink-border-subtle)] text-small text-[color:var(--ink-soft)] leading-snug text-center"
                style={{ fontWeight: 500 }}
              >
                {maskMessage(nameProfile)}
              </div>
            )}

            <input
              autoFocus
              value={draft}
              disabled={isLocked}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              maxLength={20}
              className="border border-[var(--ink-border-subtle)] outline-none rounded-xl px-4 py-3 text-base w-full box-border text-center bg-[var(--surface-panel)] text-[color:var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 500 }}
            />

            {error && (
              <div className="text-small text-center text-[color:var(--ink-soft)]" style={{ fontWeight: 500 }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLocked}
                className="flex-1 border-none rounded-xl py-3 text-sm cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 700 }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl py-3 text-sm cursor-pointer border border-[var(--ink-border)] bg-transparent text-[color:var(--ink)]"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
