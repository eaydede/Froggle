import { useState } from 'react';

interface ProfileDisplayProps {
  displayName: string;
  onSave: (name: string) => void;
}

export function ProfileDisplay({ displayName, onSave }: ProfileDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

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
        onClick={handleOpen}
        className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-[0.7rem] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          {displayName}
        </span>
      </button>

      {editing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-[340px] bg-[var(--card)] rounded-2xl p-6 flex flex-col gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[0.85rem] font-semibold text-center text-[var(--text)]" style={{ fontFamily: 'var(--font-body)' }}>
              Display Name
            </div>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              maxLength={20}
              className="border-none outline-none rounded-xl px-4 py-3.5 text-[1rem] w-full box-border text-center bg-[var(--track)] text-[var(--text)]"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 border-none rounded-xl py-3.5 text-[0.85rem] cursor-pointer text-white bg-[var(--accent)] active:scale-[0.975] active:duration-[60ms] transition-all duration-200"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 border-none rounded-xl py-3.5 text-[0.85rem] cursor-pointer bg-[var(--track)] text-[var(--text)] active:scale-[0.975] active:duration-[60ms] transition-all duration-200"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
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
