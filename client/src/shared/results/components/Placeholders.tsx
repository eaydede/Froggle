import type { ReactNode } from 'react';

interface PlaceholdersProps {
  /** When a word is highlighted, the bottom placeholder slot is replaced
   *  by the supplied node — typically a WordDefinitionPanel. The top
   *  prompt above it stays in view so the user can still pivot to a
   *  side-by-side comparison (or share the board) without dismissing
   *  the definition first. */
  definitionSlot?: ReactNode;
  /** "compare" — used when there are other players to compare against.
   *  "share" — used in free-play solo to nudge the player to share the
   *  board so someone else can play it.
   *  "wait" — used in daily/zen solo (first to finish today's puzzle);
   *  there's nothing to share, just a heads-up that comparisons appear
   *  as others play. */
  variant?: 'compare' | 'share' | 'wait';
  /** Fired when the user taps the share-prompt's Share button. */
  onShare?: () => void;
  compact?: boolean;
  compareSourceLabel?: string;
}

// Stacked top-prompt + definition placeholders for the right column. Top
// prompt is ~2/3 of the height; the definitions slot occupies the
// remaining ~1/3.
export function Placeholders({
  definitionSlot,
  variant = 'compare',
  onShare,
  compact = false,
  compareSourceLabel = 'standings',
}: PlaceholdersProps = {}) {
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div
        className="w-full min-h-0"
        style={{ flex: '1 1 0' }}
      >
        {definitionSlot ?? <DefinitionsPlaceholder />}
      </div>
      {variant === 'share' ? (
        <SharePrompt onShare={onShare} compact={compact} />
      ) : variant === 'wait' ? (
        <WaitPrompt compact={compact} />
      ) : (
        <ComparePrompt compact={compact} sourceLabel={compareSourceLabel} />
      )}
    </div>
  );
}

function ComparePrompt({
  compact = false,
  sourceLabel,
}: {
  compact?: boolean;
  sourceLabel: string;
}) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center rounded-xl text-[color:var(--ink-muted)] min-h-0 ${compact ? 'px-2 py-2' : 'px-3 py-3'}`}
      style={{
        flex: '2 1 0',
        border: compact ? '1.5px dashed var(--ink-faint)' : '1.5px dashed var(--opp-accent)',
        background: compact ? 'transparent' : 'var(--opp-accent-soft)',
      }}
    >
      <div className="flex items-center gap-1 mb-1.5" aria-hidden>
        <PlaceholderInitial char="Y" accent="var(--you-accent)" />
        <span className="italic font-[family-name:var(--font-display)] text-label-xs text-[color:var(--ink-soft)]">
          vs
        </span>
        <PlaceholderInitial char="?" accent="var(--opp-accent)" />
      </div>
      <div
        className="uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] text-[color:var(--ink)] leading-[1.2]"
        style={{ fontWeight: 700 }}
      >
        Compare players
      </div>
      <div className={`${compact ? 'mt-1 px-0 text-[11px] leading-[1.25]' : 'mt-1.5 px-1 text-xs leading-[1.35]'} italic font-[family-name:var(--font-display)] text-[color:var(--ink-muted)]`}>
        Tap any name in the {sourceLabel} to see their words side-by-side with yours
      </div>
    </div>
  );
}

function WaitPrompt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center rounded-xl text-[color:var(--ink-muted)] min-h-0 ${compact ? 'px-2 py-2' : 'px-3 py-3'}`}
      style={{
        flex: '2 1 0',
        border: compact ? '1.5px dashed var(--ink-faint)' : '1.5px dashed var(--opp-accent)',
        background: compact ? 'transparent' : 'var(--opp-accent-soft)',
      }}
    >
      <div className="flex items-center gap-1 mb-1.5" aria-hidden>
        <PlaceholderInitial char="Y" accent="var(--you-accent)" />
        <span className="italic font-[family-name:var(--font-display)] text-label-xs text-[color:var(--ink-soft)]">
          vs
        </span>
        <PlaceholderInitial char="?" accent="var(--opp-accent)" />
      </div>
      <div
        className="uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] text-[color:var(--ink)] leading-[1.2]"
        style={{ fontWeight: 700 }}
      >
        First to finish
      </div>
      <div className={`${compact ? 'mt-1 px-0 text-[11px] leading-[1.25]' : 'mt-1.5 px-1 text-xs leading-[1.35]'} italic font-[family-name:var(--font-display)] text-[color:var(--ink-muted)]`}>
        Check back as others play to compare your words side-by-side
      </div>
    </div>
  );
}

function SharePrompt({ onShare, compact = false }: { onShare?: () => void; compact?: boolean }) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center rounded-xl text-[color:var(--ink-muted)] min-h-0 ${compact ? 'px-2 py-2 gap-1.5 h-full' : 'px-3 py-3 gap-2'}`}
      style={{
        flex: compact ? '2 1 0' : '2 1 0',
        border: compact ? '1.5px dashed var(--ink-faint)' : '1.5px dashed var(--opp-accent)',
        background: compact ? 'transparent' : 'var(--opp-accent-soft)',
      }}
    >
      <div className="flex items-center gap-1 mb-1" aria-hidden>
        <PlaceholderInitial char="Y" accent="var(--you-accent)" />
        <span className="italic font-[family-name:var(--font-display)] text-label-xs text-[color:var(--ink-soft)]">
          vs
        </span>
        <PlaceholderInitial char="?" accent="var(--opp-accent)" />
      </div>
      <div
        className="uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] text-[color:var(--ink)] leading-[1.15]"
        style={{ fontWeight: 700 }}
      >
        {compact ? 'Share board' : 'Share this board'}
      </div>
      <div className={`${compact ? 'px-0 text-[11px] leading-[1.2]' : 'px-1 text-xs leading-[1.35]'} italic font-[family-name:var(--font-display)] text-[color:var(--ink-muted)]`}>
        {compact ? 'Invite a friend to compare scores.' : 'Send to a friend to see how their score compares to yours'}
      </div>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer font-[family-name:var(--font-structure)] uppercase active:scale-[0.97] transition-transform duration-150"
          style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            WebkitTapHighlightColor: 'transparent',
            border: compact ? '1px solid var(--ink-border-subtle)' : '0',
            background: compact ? 'transparent' : 'var(--ink)',
            color: compact ? 'var(--ink-muted)' : 'var(--ink-inverse)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
      )}
    </div>
  );
}

function DefinitionsPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`w-full h-full flex items-center justify-center text-center rounded-xl gap-2 text-[color:var(--ink-soft)] min-h-0 overflow-hidden ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
      style={{
        border: '1.5px dashed var(--ink-faint)',
        background: 'transparent',
      }}
    >
      <svg
        width={compact ? 14 : 16}
        height={compact ? 14 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.7, flexShrink: 0 }}
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
      <div className="text-left min-w-0">
        <div
          className="uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] text-[color:var(--ink-muted)] leading-[1.1]"
          style={{ fontWeight: 700 }}
        >
          Definitions
        </div>
        <div
          className={`${compact ? 'hidden' : ''} italic font-[family-name:var(--font-display)] text-label-xs leading-[1.3] text-[color:var(--ink-soft)] mt-[2px]`}
        >
          Tap a word to see its meaning
        </div>
      </div>
    </div>
  );
}

function PlaceholderInitial({ char, accent }: { char: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[color:var(--ink-inverse)] font-[family-name:var(--font-structure)]"
      style={{
        width: '16px',
        height: '16px',
        background: accent,
        fontSize: '9px',
        fontWeight: 800,
      }}
    >
      {char}
    </span>
  );
}
