interface ChallengeTopbarProps {
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
}

export function ChallengeTopbar({ onClose, onShare, shareCopied }: ChallengeTopbarProps) {
  return (
    <header
      className="grid items-center gap-2 pt-0.5 shrink-0"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div
        className="text-center uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.12em] text-[color:var(--ink-soft)]"
        style={{ fontWeight: 700 }}
      >
        Results
      </div>
      <IconAction onClick={onShare} label={shareCopied ? 'Copied to clipboard' : 'Share'}>
        {shareCopied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </IconAction>
    </header>
  );
}

function IconAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[color:var(--ink-muted)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}
