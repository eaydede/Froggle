import { useState } from 'react';
import type { MultiplayerPlayer } from 'models/multiplayer';
import { avatarColor, avatarInitial } from '../../shared/multiplayer/avatar';

interface LobbyPlayerStripProps {
  players: MultiplayerPlayer[];
  youId: string | null;
}

// The "In the room" roster from the mock: a horizontally-scrollable strip
// of player chips (colored avatar + name + Host/You tag). Tapping a chip
// selects it — purely a legibility affordance so a long name can be read
// in full even when the strip is scrolled. A right-edge fade hints at
// overflow.
export function LobbyPlayerStrip({ players, youId }: LobbyPlayerStripProps) {
  const [selectedId, setSelectedId] = useState<string | null>(youId);

  // Host first, then you, then the rest by join order — keeps the two
  // "anchor" identities at the front where they're always visible.
  const ordered = [...players].sort((a, b) => {
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    if (a.id === youId !== (b.id === youId)) return a.id === youId ? -1 : 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className="relative -mx-1">
      <div
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {ordered.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            isYou={p.id === youId}
            selected={selectedId === p.id}
            onSelect={() => setSelectedId(p.id)}
          />
        ))}
      </div>
      {/* Right-edge overflow fade — fades to the card surface so chips
          dissolve rather than getting clipped mid-glyph. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-1.5 w-7 z-[2]"
        style={{
          background:
            'linear-gradient(to left, var(--surface-card) 5%, transparent)',
        }}
      />
    </div>
  );
}

interface PlayerChipProps {
  player: MultiplayerPlayer;
  isYou: boolean;
  selected: boolean;
  onSelect: () => void;
}

function PlayerChip({ player, isYou, selected, onSelect }: PlayerChipProps) {
  const tag = player.isHost ? 'Host' : isYou ? 'You' : null;
  const tagColor = player.isHost
    ? 'var(--podium-gold)'
    : isYou
      ? 'var(--logo-dot)'
      : 'var(--ink-muted)';
  const tagBg = player.isHost
    ? 'var(--podium-gold-bg)'
    : isYou
      ? 'var(--accent-soft)'
      : 'var(--ink-whisper)';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-2.5 shrink-0 whitespace-nowrap transition-colors duration-150"
      style={{
        scrollSnapAlign: 'start',
        background: selected ? 'var(--ink-trace)' : 'var(--ink-whisper)',
        border: `1px solid ${
          player.isHost
            ? 'var(--podium-gold-bg)'
            : selected
              ? 'var(--ink-border)'
              : 'var(--ink-border-subtle)'
        }`,
        opacity: player.connected ? 1 : 0.5,
        animation: 'lobby-chip-in 260ms cubic-bezier(0.22,1,0.36,1) both',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0 tabular-nums"
        style={{
          width: 22,
          height: 22,
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--ink-inverse)',
          background: avatarColor(player.id, { isYou, isHost: player.isHost }),
        }}
      >
        {avatarInitial(player.displayName)}
      </span>
      <span
        className="truncate text-caption"
        style={{
          maxWidth: 96,
          fontWeight: 600,
          color: player.isHost ? 'var(--podium-gold)' : 'var(--ink)',
        }}
      >
        {player.displayName}
      </span>
      {tag && (
        <span
          className="uppercase rounded-full leading-none"
          style={{
            fontSize: 8,
            letterSpacing: '0.1em',
            fontWeight: 700,
            padding: '3px 5px 2px',
            color: tagColor,
            background: tagBg,
          }}
        >
          {tag}
        </span>
      )}
    </button>
  );
}
