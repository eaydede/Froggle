import { type GameConfig } from 'models';
import type {
  MultiplayerBoard,
  MultiplayerRoom
} from 'models/multiplayer';
export interface RoomEntry {
  room: MultiplayerRoom;
  boardTimer: NodeJS.Timeout | null;
  /** Every found-able word on the current board, server-only. Kept off
   *  the broadcast so the dictionary never reaches clients mid-game; the
   *  results endpoint exposes it once the board has ended so the word
   *  list can show missed words like every other results page. */
  boardWords: string[];
  /** Private reconnect-key → public player id. The key is the client's
   *  secret (carried only in the socket handshake auth); the public id is
   *  what appears in `hostId`/`players[].id` and every room snapshot. They
   *  are deliberately different so reading a snapshot never reveals anyone's
   *  reconnect key — otherwise the host's id would be their auth secret and
   *  anyone with the room code could reconnect as them. */
  keyToPlayerId: Map<string, string>;
  /** Live socket count per public player id. Identity is per reconnect key,
   *  but a single player can hold several concurrent sockets (two tabs, or a
   *  reconnect that overlaps the old socket). Presence is "any socket open",
   *  so `connected` only flips false when this count reaches zero — closing
   *  one of several sockets must not drop the player or move host controls. */
  socketCounts: Map<string, number>;
  /** Bumped on every mutation so the cleanup sweep can purge idle rooms
   *  without holding active ones. */
  lastActivity: number;
  /** Public player id → authenticated Supabase user id, for the players the
   *  server could verify at join. Server-only (never broadcast) so a snapshot
   *  can't leak a player's user id. Used to key persisted history rows when a
   *  board ends. */
  userIds: Map<string, string>;
  /** The in-flight (or settled) persistence write for the most recently ended
   *  board. The share endpoint awaits this so a challenge can be minted the
   *  instant results appear, before the async insert would otherwise land.
   *  Resolves only once the deferred write below has actually run. */
  lastPersistence: Promise<void> | null;
  /** Timer that runs the deferred history write after the post-end grace
   *  window closes (see schedulePersistence). Cleared if the write is flushed
   *  early. */
  persistTimer: NodeJS.Timeout | null;
  /** Runs the pending history write immediately and idempotently. startBoard
   *  calls this before it resets per-player state so a fast next round can't
   *  wipe an unpersisted board; null when no write is pending. */
  flushPersistence: (() => void) | null;
  /** Authenticated user id of the host that started the current board, captured
   *  at start so the deferred history write attributes the round to whoever ran
   *  it — not to a successor promoted during the post-end grace window (or by
   *  the very departure that ended the round). Null when the host wasn't
   *  authenticated. */
  currentBoardHostUserId: string | null;
}

export interface RoomBoardCompletion {
  seed: number;
  board: string[][];
  config: GameConfig;
  startedAt: number;
  endedAt: number;
  /** Authenticated user id of the host that started this board, when the host
   *  was signed in. The persistence layer makes this player the
   *  originator/owner of the linked challenge, so a shared multiplayer board
   *  attributes to whoever ran the round rather than an arbitrary row. Null
   *  when the host wasn't authenticated. */
  hostUserId: string | null;
  participants: Array<{
    userId: string;
    foundWords: string[];
    points: number;
    wordCount: number;
    longestWord: string;
  }>;
}

export type BoardCompletionHandler = (completion: RoomBoardCompletion) => Promise<void> | void;

export interface CreateRoomOptions {
  config?: Partial<GameConfig>;
}

export interface StartBoardResult {
  room: MultiplayerRoom;
  board: MultiplayerBoard;
}

export interface NudgeResult {
  allowed: boolean;
  hostId?: string;
  fromName?: string;
}

export interface SubmitResult {
  outcome:
  | { valid: true; word: string; score: number; }
  | { valid: false; word?: string; reason: 'invalid' | 'repeat' | 'expired'; };
  room: MultiplayerRoom;
}
