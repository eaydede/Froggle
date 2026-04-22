import { useState } from "react";

interface ProfileAvatarProps {
  displayName: string;
  onSave: (name: string) => void;
}

export function ProfileAvatar({ displayName, onSave }: ProfileAvatarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const handleOpen = () => {
    setDraft(displayName);
    setEditing(true);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== displayName) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(displayName);
    setEditing(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Profile"
        className="w-[34px] h-[34px] rounded-[10px] bg-transparent border border-[var(--ink-border)] flex items-center justify-center text-small text-[color:var(--ink)] cursor-pointer font-[family-name:var(--font-ui)]"
        style={{ fontWeight: 600, WebkitTapHighlightColor: "transparent" }}
      >
        {initial}
      </button>

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
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              maxLength={20}
              className="border border-[var(--ink-border-subtle)] outline-none rounded-xl px-4 py-3 text-base w-full box-border text-center bg-[var(--surface-panel)] text-[color:var(--ink)]"
              style={{ fontWeight: 500 }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 border-none rounded-xl py-3 text-sm cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)]"
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
    </>
  );
}
