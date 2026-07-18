// Socket.io wiring for multiplayer free-play.
//
// One namespace ('/multiplayer'). Each socket joins exactly one Socket.io
// room (keyed by the multiplayer room code) so broadcasts stay scoped to
// participants. Every state-changing event re-emits a full room snapshot
// so the client never has to reconcile partial updates — easier to keep
// correct than incremental patches and the rooms are small enough that
// the payload cost is negligible.

import type { Server, Socket } from 'socket.io';
import type {
  MultiplayerHandshake,
  RoomStateBroadcast,
  RoomVisibility,
  WordSubmitPayload,
  WordSubmitResult,
} from 'models/multiplayer';
import type { GameConfig, Position } from 'models';
import {
  advanceCountdown,
  disconnectPlayer,
  endBoard,
  getRoom,
  joinRoom,
  leaveRoom,
  markPlayerFinished,
  registerNudge,
  returnToLobby,
  setVisibility,
  startBoard,
  submitWord,
  updateNextConfig,
} from './store.js';
import { verifyAccessToken } from '../middleware/auth.js';
import { getDisplayName } from '../services/displayNames.js';

// Name used when a socket can't be tied to an authenticated user. The client
// always carries a (possibly anonymous) Supabase session, so this is only a
// safe fallback — a client-supplied name is never trusted, which is what
// keeps multiplayer names inside the same moderation as every other surface.
const FALLBACK_DISPLAY_NAME = 'Player';

interface SocketData {
  roomCode: string;
  /** Private reconnect secret from the handshake auth. Used only to resolve
   *  identity at join time; never compared against public ids or broadcast. */
  playerKey: string;
  /** Public player id assigned by the store. This is what appears in room
   *  snapshots and what every authorization check compares against. */
  playerId: string;
  displayName: string;
}

/** The live sockets in one room. Resolved through Socket.io's own room
 *  membership index (every socket `join`s its room code) so this is O(room
 *  size), not O(all connected sockets across every room). */
function socketsInRoom(io: Server, roomCode: string): Socket[] {
  const namespace = io.of('/multiplayer');
  const ids = namespace.adapter.rooms.get(roomCode);
  if (!ids) return [];
  const sockets: Socket[] = [];
  for (const id of ids) {
    const socket = namespace.sockets.get(id);
    if (socket) sockets.push(socket);
  }
  return sockets;
}

function emitState(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;
  // Every connected socket gets the snapshot tailored to their own id —
  // the `youId` lets the client highlight themselves in the roster
  // without server-side bookkeeping.
  // One timestamp for the whole fan-out so every recipient seeds its clock
  // offset against the same instant.
  const serverNow = Date.now();
  for (const socket of socketsInRoom(io, roomCode)) {
    const data = socket.data as Partial<SocketData>;
    socket.emit('room:state', { room, youId: data.playerId, serverNow } as RoomStateBroadcast);
  }
}

function readHandshake(socket: Socket): MultiplayerHandshake | null {
  const auth = (socket.handshake.auth ?? {}) as Partial<MultiplayerHandshake>;
  const roomCode = (auth.roomCode ?? '').toString().toUpperCase().trim();
  const playerKey = (auth.playerKey ?? '').toString().trim();
  const accessToken = (auth.accessToken ?? '').toString();
  if (!roomCode || !playerKey) return null;
  return { roomCode, playerKey, accessToken };
}

export function attachMultiplayerSockets(io: Server): void {
  const ns = io.of('/multiplayer');

  ns.on('connection', async (socket) => {
    // Clock sync. Registered first thing — before the auth / display-name /
    // join awaits below — so the listener is up the instant the socket
    // connects. The client probes this on its own 'connect' event; if we only
    // attached the listener after those awaits, that first probe could land in
    // the gap and be dropped, leaving the client on a 0 offset (a wrong device
    // clock distorting the "get ready" countdown — a 30s-slow clock showed a
    // 33s countdown) until a later probe happened to land. It just echoes the
    // server's wall time and touches no room state, so answering before
    // identity is resolved is safe.
    socket.on('time:sync', (ack?: (serverTime: number) => void) => {
      if (typeof ack === 'function') ack(Date.now());
    });

    const hs = readHandshake(socket);
    if (!hs) {
      socket.emit('room:error', { reason: 'bad-handshake' });
      socket.disconnect(true);
      return;
    }

    const room = getRoom(hs.roomCode);
    if (!room) {
      socket.emit('room:error', { reason: 'not-found' });
      socket.disconnect(true);
      return;
    }

    // Derive the public name from the authenticated user — the client never
    // supplies it — so it passes through the same masking/lockout moderation
    // as every other surface. An unauthenticated socket falls back to a safe
    // constant rather than a client-chosen string.
    const userId = await verifyAccessToken(hs.accessToken);
    const displayName = userId ? await getDisplayName(userId) : FALLBACK_DISPLAY_NAME;

    // The socket may have been torn down during the awaits above.
    if (socket.disconnected) return;

    const result = joinRoom(hs.roomCode, hs.playerKey, displayName, userId);
    if (!result) {
      socket.emit('room:error', { reason: 'not-found' });
      socket.disconnect(true);
      return;
    }

    socket.data = {
      roomCode: hs.roomCode,
      playerKey: hs.playerKey,
      playerId: result.player.id,
      displayName,
    } satisfies SocketData;
    socket.join(hs.roomCode);

    emitState(io, hs.roomCode);

    socket.on('config:update', (payload: Partial<GameConfig>) => {
      const data = socket.data as SocketData;
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.playerId) return;
      updateNextConfig(data.roomCode, payload);
      emitState(io, data.roomCode);
    });

    socket.on('visibility:set', (payload: { visibility: RoomVisibility }) => {
      const data = socket.data as SocketData;
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.playerId) return;
      const next = payload?.visibility === 'public' ? 'public' : 'private';
      setVisibility(data.roomCode, next);
      emitState(io, data.roomCode);
    });

    socket.on('board:start', () => {
      const data = socket.data as SocketData;
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.playerId) return;
      const started = startBoard(data.roomCode, () => emitState(io, data.roomCode));
      if (started) emitState(io, data.roomCode);
    });

    socket.on('board:advance-countdown', () => {
      const data = socket.data as SocketData;
      const advanced = advanceCountdown(data.roomCode, data.playerId, () =>
        emitState(io, data.roomCode),
      );
      if (advanced) emitState(io, data.roomCode);
    });

    socket.on(
      'word:submit',
      (payload: WordSubmitPayload, ack?: (result: WordSubmitResult) => void) => {
        const data = socket.data as SocketData;
        const path = (payload?.path ?? []) as Position[];
        const result = submitWord(data.roomCode, data.playerId, path);
        if (!result) {
          ack?.({ valid: false, reason: 'invalid' });
          return;
        }
        ack?.(result.outcome);
        // Only a valid word changes shared state worth broadcasting. Rejected
        // attempts are acked (for the toast) and recorded server-side, but
        // don't warrant pushing the room snapshot to everyone.
        if (result.outcome.valid) emitState(io, data.roomCode);
      },
    );

    socket.on('player:finished', () => {
      const data = socket.data as SocketData;
      markPlayerFinished(data.roomCode, data.playerId);
      emitState(io, data.roomCode);
    });

    socket.on('host:nudge', () => {
      const data = socket.data as SocketData;
      const result = registerNudge(data.roomCode, data.playerId);
      if (!result.allowed || !result.hostId) return; // on cooldown / not allowed
      // Deliver only to the host's socket(s) — a private "hurry up" cue.
      for (const s of socketsInRoom(io, data.roomCode)) {
        const sd = s.data as Partial<SocketData>;
        if (sd.playerId === result.hostId) {
          s.emit('room:nudge', { from: result.fromName ?? 'A player' });
        }
      }
    });

    socket.on('board:end', () => {
      const data = socket.data as SocketData;
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.playerId) return;
      endBoard(data.roomCode);
      emitState(io, data.roomCode);
    });

    socket.on('board:return-to-lobby', () => {
      const data = socket.data as SocketData;
      const room = getRoom(data.roomCode);
      if (!room || room.hostId !== data.playerId) return;
      returnToLobby(data.roomCode);
      emitState(io, data.roomCode);
    });

    socket.on('room:leave', () => {
      const data = socket.data as SocketData;
      const remaining = leaveRoom(data.roomCode, data.playerId);
      if (remaining) emitState(io, data.roomCode);
      socket.disconnect(true);
    });

    socket.on('disconnect', () => {
      const data = socket.data as SocketData;
      if (!data?.roomCode) return;
      disconnectPlayer(data.roomCode, data.playerId);
      emitState(io, data.roomCode);
    });
  });
}
