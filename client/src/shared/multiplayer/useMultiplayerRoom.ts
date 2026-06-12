import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameConfig, Position } from 'models';
import type {
  MultiplayerRoom,
  RoomStateBroadcast,
  RoomVisibility,
  WordSubmitResult,
} from 'models/multiplayer';

const PLAYER_KEY_STORAGE = 'froggle-multiplayer-player-key';

function loadOrCreatePlayerKey(): string {
  try {
    const existing = localStorage.getItem(PLAYER_KEY_STORAGE);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(PLAYER_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    // Privacy mode / SSR: fall through to a session-only id.
    return crypto.randomUUID();
  }
}

export type ConnectionStatus = 'connecting' | 'connected' | 'closed' | 'error';

export interface UseMultiplayerRoomResult {
  room: MultiplayerRoom | null;
  /** The id of the local player within `room.players`, mirrored from the
   *  server's broadcast so the UI can highlight the viewer without
   *  guessing. */
  youId: string | null;
  isHost: boolean;
  status: ConnectionStatus;
  errorReason: string | null;
  /** Host-only: update the config that will apply to the next board. */
  updateNextConfig: (patch: Partial<GameConfig>) => void;
  /** Host-only: flip the room between private and public. */
  setVisibility: (visibility: RoomVisibility) => void;
  /** Host-only: start the next board with the current `nextConfig`. */
  startBoard: () => void;
  /** Solo only: fast-forward the pre-board countdown one step so play starts
   *  sooner. No-ops server-side once a second player is connected. */
  advanceCountdown: () => void;
  /** Host-only: forcibly end the active board (skips remaining time). */
  endBoardForRoom: () => void;
  /** Host-only: return the room to lobby state from results. */
  returnToLobby: () => void;
  /** Submit a word against the active board. Returns the server's ack. */
  submitWord: (path: Position[]) => Promise<WordSubmitResult>;
  /** Mark the local player as finished with the current board (manual
   *  end). The server auto-finalizes when every active player is done. */
  finishMyBoard: () => void;
  /** Permanently leave the room — also disconnects the socket. */
  leaveRoom: () => void;
  /** Non-host: ask the host to start. Server enforces a per-player
   *  cooldown; the host receives a private nudge notification. */
  nudgeHost: () => void;
  /** Latest incoming nudge (host only) — `{ from, at }`, bumped each time
   *  someone nudges so the UI can surface a toast. Null until first nudge. */
  nudge: { from: string; at: number } | null;
  /** Estimated `serverClock − deviceClock`, in ms. Add to `Date.now()` to get
   *  the server's wall time. Lets timing (the pre-board countdown, the play
   *  deadline) compare against the shared clock so a wrong device clock can't
   *  distort it. 0 until the first sync round-trip completes. */
  clockOffsetMs: number;
}

interface UseMultiplayerRoomOptions {
  roomCode: string;
  /** Supabase access token (anonymous or real session). Sent in the
   *  handshake so the server can derive the moderated display name from the
   *  authenticated user — the client never asserts its own name. */
  accessToken: string | undefined;
  enabled?: boolean;
}

export function useMultiplayerRoom({
  roomCode,
  accessToken,
  enabled = true,
}: UseMultiplayerRoomOptions): UseMultiplayerRoomResult {
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [nudge, setNudge] = useState<{ from: string; at: number } | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  // True once a time:sync probe has produced a measurement. Until then the
  // room snapshot's `serverNow` seeds a coarse offset (so the countdown is
  // right from the first snapshot, before any probe lands); after, the probes
  // — which correct for round-trip latency — are authoritative and snapshots
  // stop touching the offset.
  const syncedByProbeRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const playerKeyRef = useRef<string>('');

  if (!playerKeyRef.current) playerKeyRef.current = loadOrCreatePlayerKey();

  useEffect(() => {
    if (!enabled || !roomCode) return;

    // Defer the actual connection to a macrotask. Under React StrictMode
    // (dev) the effect mounts → unmounts → mounts synchronously; without
    // this delay that opens a socket and tears it straight back down,
    // which churns the vite ws proxy and logs "write EPIPE". Scheduling
    // the connect lets the transient mount cancel before any socket is
    // opened, so only one connection is ever made.
    let socket: Socket | null = null;
    let cancelled = false;
    setStatus('connecting');
    setErrorReason(null);

    const timer = setTimeout(() => {
      const url = `${window.location.origin}/multiplayer`;
      socket = io(url, {
        auth: {
          roomCode,
          playerKey: playerKeyRef.current,
          accessToken: accessToken ?? '',
        },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      // Estimate the device→server clock offset with a short burst of timed
      // round-trips (NTP-style: keep the sample with the lowest round-trip
      // time, since that one has the least one-way asymmetry). Runs on every
      // connect — a reconnect re-measures — and settles within ~1s, well
      // before the host can start a board.
      const syncClock = () => {
        if (cancelled || !socket) return;
        let bestRtt = Infinity;
        let probes = 0;
        const sample = () => {
          if (cancelled || !socket || probes >= 3) return;
          probes += 1;
          const t0 = Date.now();
          socket.timeout(3000).emit('time:sync', (err: Error | null, serverTime?: number) => {
            if (cancelled) return;
            if (!err && typeof serverTime === 'number') {
              const t1 = Date.now();
              const rtt = t1 - t0;
              syncedByProbeRef.current = true;
              if (rtt < bestRtt) {
                bestRtt = rtt;
                // Assume a symmetric round-trip: the server's reply reflects
                // its clock at ~t0 + rtt/2, so the offset to add to a local
                // timestamp is serverTime − (t0 + rtt/2).
                setClockOffsetMs(serverTime - (t0 + rtt / 2));
              }
            }
            setTimeout(sample, 150);
          });
        };
        sample();
      };

      socket.on('connect', () => {
        setStatus('connected');
        syncClock();
      });
      socket.on('disconnect', () => setStatus('closed'));
      socket.on('connect_error', () => {
        setStatus('error');
        setErrorReason('connect-error');
      });
      socket.on('room:error', (payload: { reason: string }) => {
        setStatus('error');
        setErrorReason(payload?.reason ?? 'unknown');
      });
      socket.on('room:state', (broadcast: RoomStateBroadcast) => {
        setRoom(broadcast.room);
        setYouId(broadcast.youId);
        // Seed a coarse clock offset from the snapshot's server timestamp so
        // the countdown is computed correctly even on the very first snapshot
        // (the one that may carry a freshly-started board), before the precise
        // probe lands. Once a probe has measured, it owns the offset.
        if (!syncedByProbeRef.current && typeof broadcast.serverNow === 'number') {
          setClockOffsetMs(broadcast.serverNow - Date.now());
        }
      });
      socket.on('room:nudge', (payload: { from: string }) => {
        setNudge({ from: payload?.from ?? 'A player', at: Date.now() });
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
    };
    // `accessToken` is captured at connect; a later token refresh doesn't
    // redial (the name is resolved server-side once, at join).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, enabled]);

  const updateNextConfig = useCallback((patch: Partial<GameConfig>) => {
    socketRef.current?.emit('config:update', patch);
  }, []);
  const setVisibility = useCallback((visibility: RoomVisibility) => {
    socketRef.current?.emit('visibility:set', { visibility });
  }, []);
  const startBoard = useCallback(() => {
    socketRef.current?.emit('board:start');
  }, []);
  const advanceCountdown = useCallback(() => {
    socketRef.current?.emit('board:advance-countdown');
  }, []);
  const endBoardForRoom = useCallback(() => {
    socketRef.current?.emit('board:end');
  }, []);
  const returnToLobby = useCallback(() => {
    socketRef.current?.emit('board:return-to-lobby');
  }, []);
  const finishMyBoard = useCallback(() => {
    socketRef.current?.emit('player:finished');
  }, []);
  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
  }, []);
  const nudgeHost = useCallback(() => {
    socketRef.current?.emit('host:nudge');
  }, []);

  const submitWord = useCallback((path: Position[]): Promise<WordSubmitResult> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve({ valid: false, reason: 'invalid' });
        return;
      }
      socket
        .timeout(4000)
        .emit('word:submit', { path }, (err: Error | null, result?: WordSubmitResult) => {
          if (err || !result) resolve({ valid: false, reason: 'invalid' });
          else resolve(result);
        });
    });
  }, []);

  const isHost = useMemo(
    () => !!(room && youId && room.hostId === youId),
    [room, youId],
  );

  return {
    room,
    youId,
    isHost,
    status,
    errorReason,
    updateNextConfig,
    setVisibility,
    startBoard,
    advanceCountdown,
    endBoardForRoom,
    returnToLobby,
    submitWord,
    finishMyBoard,
    leaveRoom,
    nudgeHost,
    nudge,
    clockOffsetMs,
  };
}
