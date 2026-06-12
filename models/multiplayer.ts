// Multiplayer free-play types.
//
// A room is an ephemeral, server-resident session keyed by a short code.
// Players join via the code, sit in a between-rounds lobby, and play the
// same seeded board on the host's signal. The room moves through three
// statuses: 'lobby' (waiting), 'playing' (current board live), 'results'
// (current board ended, host can start the next one).
//
// Reconnects are stable: clients persist a playerKey in localStorage and
// the server treats it as the player's identity within the room.

import type { Board, GameConfig } from './index.js';

export type RoomStatus = 'lobby' | 'playing' | 'results';

/** Private rooms are joinable only by code/invite link. Public rooms are
 *  additionally discoverable in a (not-yet-built) browse list — for now
 *  the flag is carried end-to-end and surfaced in the lobby, but public
 *  discovery is deferred. */
export type RoomVisibility = 'private' | 'public';

export type PlayerStatus =
  | 'lobby' // in room, not currently playing the active board
  | 'playing' // submitting words against the active board
  | 'finished'; // ended the active board (timer or manual)

export interface MultiplayerPlayer {
  /** Public, server-assigned identifier — safe to broadcast and to compare
   *  against `hostId`. Deliberately distinct from the client's private
   *  reconnect key (carried only in the socket handshake auth), so a room
   *  snapshot never leaks anyone's reconnect secret. */
  id: string;
  displayName: string;
  isHost: boolean;
  joinedAt: number;
  status: PlayerStatus;
  points: number;
  wordCount: number;
  /** Found words for the current board only. Cleared when a new board
   *  starts so the lobby card numbers reflect the latest round, not a
   *  stale aggregate. */
  foundWords: string[];
  /** Whether the socket is currently connected. Disconnected players
   *  stay in the roster (key-based identity) so reconnects slot back in. */
  connected: boolean;
  /** True once the player has explicitly left a room while a board was
   *  in progress or being scored. Their points are frozen as a snapshot
   *  and they keep their place in the standings (flagged as departed)
   *  rather than vanishing from the results. Cleared on rejoin and
   *  pruned when the next board starts. */
  left: boolean;
}

export interface MultiplayerBoard {
  board: Board;
  seed: number;
  config: GameConfig;
  startedAt: number;
  /** Set when the board has been globally finalized (host ended the
   *  round, or every active player finished). Individual player end
   *  times live on the player record. */
  endedAt: number | null;
  /** Salted hashes of every valid word on this board — handed to the
   *  client so submissions can be validated locally without a round-trip,
   *  matching the daily/gauntlet pattern. */
  wordHashes: string[];
  salt: string;
  totalFindable: number;
  /** Player ids that were dealt into this board at start (connected when
   *  the host pressed start). Players who join mid-round sit out in lobby
   *  status, so results rank only this set — a late joiner never appears as
   *  a phantom zero-score entrant in a round they didn't play. */
  participantIds: string[];
}

/** Summary of the most recently completed board, used to drive the
 *  lobby's "Last Round" card. Null until at least one board has finished
 *  in the room. */
export interface LastRoundSummary {
  winnerId: string;
  winnerName: string;
  points: number;
  wordCount: number;
  /** Consecutive boards this player has won in this room (1 = first
   *  win). Drives the "×N streak" badge. */
  streak: number;
}

/** Lightweight public-room descriptor for the browse list. Carries only
 *  what the lobby's "Public games" list needs to render a join row — never
 *  the board, word hashes, or per-player detail. */
export interface PublicRoomSummary {
  code: string;
  hostName: string;
  /** Connected players currently in the room. */
  playerCount: number;
  status: RoomStatus;
  config: GameConfig;
}

export interface PublicRoomsResponse {
  rooms: PublicRoomSummary[];
  /** Total connected players across all public rooms — drives the landing
   *  "N playing" indicator. */
  totalPlayers: number;
}

export interface MultiplayerRoom {
  code: string;
  hostId: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  /** Player config preferences for the next board the host will start.
   *  Lives on the room (not the board) so it persists across rounds and
   *  the lobby can show "Next: 4x4 · 90s" before the host commits. */
  nextConfig: GameConfig;
  players: MultiplayerPlayer[];
  /** Active board — non-null in 'playing' and 'results' statuses. */
  currentBoard: MultiplayerBoard | null;
  /** Winner of the previous board (null until one completes). */
  lastRound: LastRoundSummary | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Socket event payloads
// ---------------------------------------------------------------------------

/** What the client emits when connecting. Identity is carried in the
 *  handshake auth payload, not as a separate emit, so the server can
 *  reject malformed sockets at connection time. The display name is NOT
 *  sent — it's derived server-side from the authenticated user so it can't
 *  bypass name moderation; `accessToken` is the Supabase JWT used for that. */
export interface MultiplayerHandshake {
  roomCode: string;
  playerKey: string;
  accessToken: string;
}

/** Authoritative room snapshot the server broadcasts on every state
 *  change (join, leave, board start, word, end, next). The client treats
 *  it as the source of truth and never patches incrementally. */
export interface RoomStateBroadcast {
  room: MultiplayerRoom;
  /** Identifier the receiving client uses to know which player record
   *  in `room.players` is theirs. Echoed so the server can confirm the
   *  player key was accepted. */
  youId: string;
  /** Server wall-clock (`Date.now()`) at the moment this snapshot was
   *  emitted. The client subtracts its own clock to seed a coarse
   *  device→server offset immediately — so countdown/timer math is right
   *  from the first snapshot, before the precise `time:sync` probe lands.
   *  Carries the one-way send latency as error (~tens of ms); the probe
   *  burst refines it. */
  serverNow: number;
}

export interface WordSubmitPayload {
  path: { row: number; col: number }[];
}

export interface WordSubmitResult {
  valid: boolean;
  word?: string;
  score?: number;
  reason?: 'invalid' | 'repeat' | 'expired';
}
