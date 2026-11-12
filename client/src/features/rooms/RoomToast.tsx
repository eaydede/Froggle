interface RoomToastProps {
  message: string | null;
}

// Transient notice pinned to the top of the room screens (lobby, play,
// results). Used for events that happen to you rather than by you — most
// importantly a host handover when someone leaves — so the change never
// silently reshuffles the UI under the player. Auto-dismiss is managed by
// the caller (it owns the message lifetime); this is purely presentational.
export function RoomToast({ message }: RoomToastProps) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-4 pt-3">
      <div
        role="status"
        aria-live="polite"
        className="lobby-card pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 max-w-[340px]"
        style={{ animation: 'v2-fade-in-up 220ms cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{ width: 22, height: 22, background: 'var(--accent-soft)', color: 'var(--logo-dot)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
        </span>
        <span className="text-xs leading-snug text-[color:var(--ink)]" style={{ fontWeight: 600 }}>
          {message}
        </span>
      </div>
    </div>
  );
}
