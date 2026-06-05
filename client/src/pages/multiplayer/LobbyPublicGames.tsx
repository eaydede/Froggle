import { useEffect, useState } from 'react';
import type { PublicRoomSummary } from 'models/multiplayer';
import { fetchPublicRooms } from '../../shared/api/multiplayerApi';
import { avatarColor, avatarInitial } from '../../shared/multiplayer/avatar';

interface LobbyPublicGamesProps {
  /** The viewer's own room — excluded from the list. */
  currentCode: string;
  onJoin: (code: string) => void;
}

const POLL_MS = 5000;

// Browse list of joinable public rooms, shown in the solo lobby so a
// player can hop into someone else's game instead of waiting alone. Polls
// every few seconds; the viewer's own room is filtered out.
export function LobbyPublicGames({ currentCode, onJoin }: LobbyPublicGamesProps) {
  const [rooms, setRooms] = useState<PublicRoomSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchPublicRooms()
        .then(({ rooms }) => {
          if (!cancelled) setRooms(rooms.filter((r) => r.code !== currentCode));
        })
        .catch(() => {
          if (!cancelled && rooms === null) setRooms([]);
        });
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode]);

  return (
    <div className="lobby-card px-4 pt-3 pb-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span
          className="text-caption uppercase tracking-[0.14em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Public games
        </span>
        {rooms && rooms.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 text-label-xs uppercase tracking-[0.08em] text-[color:var(--logo-dot)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            <span className="size-1.5 rounded-full" style={{ background: 'var(--logo-dot)' }} />
            {rooms.length} open
          </span>
        )}
      </div>

      {rooms === null ? (
        <EmptyState label="Looking for games…" />
      ) : rooms.length === 0 ? (
        <EmptyState label="No public games right now — set yours to public to host one." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {rooms.map((r) => (
            <PublicGameRow key={r.code} room={r} onJoin={() => onJoin(r.code)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center text-xs italic text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
      style={{ background: 'var(--surface-bg)', border: '1px dashed var(--ink-border-subtle)' }}
    >
      {label}
    </div>
  );
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

function PublicGameRow({ room, onJoin }: { room: PublicRoomSummary; onJoin: () => void }) {
  const inLobby = room.status === 'lobby';
  return (
    <button
      type="button"
      onClick={onJoin}
      className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 border text-left transition-colors"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--ink-border-subtle)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 28,
          height: 28,
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink-inverse)',
          background: avatarColor(room.code),
        }}
      >
        {avatarInitial(room.hostName)}
      </span>

      <span className="flex flex-col min-w-0 flex-1 gap-0.5">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-xs text-[color:var(--ink)]" style={{ fontWeight: 600 }}>
            {room.hostName}
          </span>
          <span
            className="shrink-0 uppercase rounded-full leading-none"
            style={{
              fontSize: 8,
              letterSpacing: '0.08em',
              fontWeight: 700,
              padding: '2px 5px',
              color: inLobby ? 'var(--logo-dot)' : 'var(--ink-soft)',
              background: inLobby ? 'var(--accent-soft)' : 'var(--ink-whisper)',
            }}
          >
            {inLobby ? 'In lobby' : 'In game'}
          </span>
        </span>
        <span className="text-label-xs text-[color:var(--ink-soft)] tabular-nums" style={{ fontWeight: 500 }}>
          {room.playerCount} {room.playerCount === 1 ? 'player' : 'players'} · {room.config.boardSize}×
          {room.config.boardSize} · {formatTimer(room.config.durationSeconds)}
        </span>
      </span>

      <span
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs bg-[var(--ink)] text-[color:var(--ink-inverse)] transition-transform group-hover:-translate-y-px"
        style={{ fontWeight: 700 }}
      >
        Join
      </span>
    </button>
  );
}
