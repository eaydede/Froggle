interface LobbyIntroProps {
  onDismiss: () => void;
}

// One-screen explainer for the merged Free Play / lobby page. Free Play
// used to be a plain solo config screen; this calls out that solo still
// works exactly as before and that the room code / visibility controls are
// optional, multiplayer-only extras. Shown automatically the first time,
// and reachable afterwards from the header's help button.
export function LobbyIntro({ onDismiss }: LobbyIntroProps) {
  return (
    <div
      className="lobby-card px-4 pt-3 pb-3.5 flex flex-col gap-2.5"
      style={{ animation: 'lobby-room-reveal 280ms cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-caption uppercase tracking-[0.14em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          How this works
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="size-6 flex items-center justify-center rounded-full bg-transparent border-0 cursor-pointer text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <IntroPoint
        title="Still just Free Play"
        body="Want to play alone? Tap Start — it works exactly like before. Everything below is optional."
        icon={
          <>
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </>
        }
      />
      <IntroPoint
        title="Play with friends"
        body="Share your room code and everyone plays the same boards together, round by round."
        icon={
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        }
      />
      <IntroPoint
        title="Private or public"
        body="Private: only people with the code can join. Public: anyone can find and join your room."
        icon={
          <>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </>
        }
      />

      <button
        type="button"
        onClick={onDismiss}
        className="mt-1 w-full rounded-xl border-0 cursor-pointer py-2.5 text-sm bg-[var(--ink)] text-[color:var(--ink-inverse)] transition-transform hover:-translate-y-px active:scale-[0.99]"
        style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
      >
        Got it
      </button>
    </div>
  );
}

function IntroPoint({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="inline-flex items-center justify-center rounded-lg shrink-0 mt-0.5"
        style={{
          width: 28,
          height: 28,
          background: 'var(--accent-soft)',
          color: 'var(--logo-dot)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-[color:var(--ink)]" style={{ fontWeight: 700 }}>
          {title}
        </span>
        <span className="text-label-xs leading-[1.4] text-[color:var(--ink-soft)]" style={{ fontWeight: 500 }}>
          {body}
        </span>
      </span>
    </div>
  );
}
