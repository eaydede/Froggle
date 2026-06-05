import { useState } from 'react';
import type { MultiplayerRoom, RoomVisibility } from 'models/multiplayer';
import { copyToClipboard } from '../../shared/utils/clipboard';
import { LobbyPlayerStrip } from './LobbyPlayerStrip';

interface LobbyRoomCardProps {
  room: MultiplayerRoom;
  youId: string | null;
  isHost: boolean;
  /** Solo = the viewer is the only one here. Hides the player strip and
   *  drops the "In the room" header; the room code + share + visibility
   *  stay so a solo player can still invite someone in. */
  solo: boolean;
  onShare: () => void;
  onToggleVisibility: (next: RoomVisibility) => void;
}

export function LobbyRoomCard({
  room,
  youId,
  isHost,
  solo,
  onShare,
  onToggleVisibility,
}: LobbyRoomCardProps) {
  const [copied, setCopied] = useState(false);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const isPublic = room.visibility === 'public';

  // The Copy button copies the bare code (what's shown), not the invite
  // URL — that's the Share button's job — so pasting it into a "join"
  // field Just Works.
  const handleCopy = async () => {
    const ok = await copyToClipboard(room.code);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="lobby-card px-4 pt-3 pb-3 relative overflow-hidden">
      {/* Soft green bloom behind the code, top-right — the card's pop of
          color, echoing the green room code. */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 size-32 rounded-full opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 65%)' }}
      />

      <div className="flex items-center justify-between gap-3 relative">
        <div className="min-w-0">
          <div
            className="text-label-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)] mb-1 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Room
          </div>
          <div
            className="text-[22px] leading-none tabular-nums"
            style={{ fontWeight: 800, letterSpacing: '0.12em', color: 'var(--logo-dot)' }}
          >
            {room.code}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy room code"
            className="size-9 rounded-full flex items-center justify-center bg-[var(--ink-whisper)] hover:bg-[var(--ink-trace)] border border-[color:var(--ink-border-subtle)] text-[color:var(--ink)] transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="h-9 px-3 rounded-full border-0 cursor-pointer flex items-center gap-1.5 bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)] active:scale-[0.98] transition-all"
            style={{ fontWeight: 700, fontSize: 11, WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Visibility toggle — host-controlled. Non-hosts see the current
          state as a static row (no switch affordance) so they understand
          the room's joinability without being able to change it. */}
      <div className="mt-3">
        <VisibilityRow
          isPublic={isPublic}
          interactive={isHost}
          onToggle={() => onToggleVisibility(isPublic ? 'private' : 'public')}
        />
      </div>

      {!solo && (
        // Slides + fades in the first time a second player turns the solo
        // config into a shared lobby, so the roster doesn't pop in abruptly.
        <div style={{ animation: 'lobby-room-reveal 320ms cubic-bezier(0.22,1,0.36,1) both' }}>
          <div className="h-px my-3" style={{ background: 'var(--ink-border-subtle)' }} />
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-label-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
                style={{ fontWeight: 700 }}
              >
                In the room
              </span>
              <span className="text-caption tabular-nums text-[color:var(--ink)]" style={{ fontWeight: 700 }}>
                {String(connectedCount).padStart(2, '0')}
              </span>
            </div>
          </div>
          <LobbyPlayerStrip players={room.players} youId={youId} />
        </div>
      )}
    </div>
  );
}

interface VisibilityRowProps {
  isPublic: boolean;
  interactive: boolean;
  onToggle: () => void;
}

function VisibilityRow({ isPublic, interactive, onToggle }: VisibilityRowProps) {
  const label = isPublic ? 'Public room' : 'Private room';
  const desc = isPublic
    ? 'Anyone can find and join this room'
    : 'Joinable only with this code';

  return (
    <button
      type="button"
      onClick={interactive ? onToggle : undefined}
      disabled={!interactive}
      aria-pressed={isPublic}
      className="flex items-center gap-2.5 w-full rounded-xl py-2 pl-2.5 pr-2.5 text-left transition-colors"
      style={{
        background: 'var(--surface-bg)',
        border: '1px solid var(--ink-border-subtle)',
        cursor: interactive ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-[9px] shrink-0 transition-colors"
        style={{
          width: 28,
          height: 28,
          background: isPublic ? 'var(--accent-soft)' : 'var(--ink-whisper)',
          border: `1px solid ${isPublic ? 'var(--accent-glow)' : 'var(--ink-border-subtle)'}`,
          color: isPublic ? 'var(--logo-dot)' : 'var(--ink-muted)',
        }}
      >
        {isPublic ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14 14 0 0 1 0 18" />
            <path d="M12 3a14 14 0 0 0 0 18" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="13" height="9" rx="2" />
            <path d="M8 11V7.5a3.5 3.5 0 0 1 7 0V11" />
          </svg>
        )}
      </span>
      <span className="flex flex-col gap-px min-w-0 flex-1">
        <span
          className="text-caption leading-tight"
          style={{ fontWeight: 700, color: isPublic ? 'var(--logo-dot)' : 'var(--ink)' }}
        >
          {label}
        </span>
        <span className="text-label-xs text-[color:var(--ink-soft)] leading-tight" style={{ fontWeight: 500 }}>
          {desc}
        </span>
      </span>
      {interactive && (
        <span
          aria-hidden
          className="relative shrink-0 rounded-full transition-colors"
          style={{
            width: 36,
            height: 20,
            background: isPublic ? 'var(--accent-glow)' : 'var(--ink-trace)',
            border: `1px solid ${isPublic ? 'var(--logo-dot)' : 'var(--ink-border-subtle)'}`,
          }}
        >
          <span
            className="absolute rounded-full transition-[left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              top: 1,
              left: isPublic ? 17 : 1,
              width: 16,
              height: 16,
              background: 'var(--ink-inverse)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
          />
        </span>
      )}
    </button>
  );
}
