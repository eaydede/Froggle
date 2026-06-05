// In-memory room store for multiplayer free-play.
//
// Rooms are ephemeral: they live in this process and disappear on restart.
// That's intentional for v1 — these are pickup sessions, not durable
// matches, and persisting them would force decisions (auth, history,
// leaderboards) we don't need yet. If a host migrates to a different
// server instance we lose the room; for now Fly's single-process scale-1
// makes that a non-issue.

import { randomUUID } from 'node:crypto';
import { generateSeededBoard } from 'engine/board.js';
import { isValidPath } from 'engine/adjacency.js';
import { isValidWord } from 'engine/dictionary.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { hashWord, generateSalt, type Position, type GameConfig } from 'models';
import { randomSeed } from 'models/seedCode';
import type {
  MultiplayerBoard,
  MultiplayerPlayer,
  MultiplayerRoom,
  PublicRoomSummary,
  RoomVisibility,
} from 'models/multiplayer';
import { dictionary } from '../services/dictionary.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/I/O ambiguity
const ROOM_CODE_LENGTH = 5;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h after last activity → purged

const DEFAULT_CONFIG: GameConfig = {
  durationSeconds: 180,
  boardSize: 4,
  minWordLength: 3,
};

const GRACE_PERIOD_MS = 500;
// A board's startedAt is set this far in the future so every client gets a
// shared "get ready" countdown before words count — nobody is dropped onto
// a live board with no warning. The play window (duration) begins at
// startedAt, so the countdown doesn't eat into anyone's time.
const COUNTDOWN_MS = 3000;

/** Clamp untrusted config to supported bounds. Kept loose — the lobby UI
 *  surfaces the same presets as solo free-play — but it's the single
 *  trusted boundary both the REST create path and the socket update path
 *  pass through, so a hand-crafted payload (e.g. `boardSize: 50`) can never
 *  reach board generation/solver work. */
export function sanitizeConfig(input: unknown): Partial<GameConfig> {
  const raw = (input ?? {}) as Partial<GameConfig>;
  const out: Partial<GameConfig> = {};
  if (typeof raw.boardSize === 'number' && [4, 5, 6].includes(raw.boardSize)) {
    out.boardSize = raw.boardSize;
  }
  if (typeof raw.durationSeconds === 'number') {
    // Finite timers only (30..600s). Unlike solo free-play, a multiplayer
    // round has no per-player engine timer — the board's countdown is the
    // sole backstop that ends it if players drop — so a no-timer (Zen) round
    // could hang forever. Out-of-range/non-positive values are dropped, so
    // the config keeps its prior finite value (default 180s).
    const v = Math.floor(raw.durationSeconds);
    if (v >= 30 && v <= 600) out.durationSeconds = v;
  }
  if (typeof raw.minWordLength === 'number' && raw.minWordLength >= 3 && raw.minWordLength <= 6) {
    out.minWordLength = Math.floor(raw.minWordLength);
  }
  return out;
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

interface RoomEntry {
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
}

const rooms = new Map<string, RoomEntry>();

export interface CreateRoomOptions {
  config?: Partial<GameConfig>;
}

export function createRoom(options: CreateRoomOptions = {}): MultiplayerRoom {
  // Generate a unique code (collision is astronomically unlikely at
  // current scale but cheap to guard against).
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();

  const nextConfig: GameConfig = {
    ...DEFAULT_CONFIG,
    ...sanitizeConfig(options.config),
  };

  const room: MultiplayerRoom = {
    code,
    hostId: '', // assigned when the first player joins
    status: 'lobby',
    visibility: 'private',
    nextConfig,
    players: [],
    currentBoard: null,
    lastRound: null,
    createdAt: Date.now(),
  };

  rooms.set(code, {
    room,
    boardTimer: null,
    boardWords: [],
    keyToPlayerId: new Map(),
    socketCounts: new Map(),
    lastActivity: Date.now(),
  });
  return room;
}

export function getRoom(code: string): MultiplayerRoom | null {
  const entry = rooms.get(code.toUpperCase());
  return entry?.room ?? null;
}

function getEntry(code: string): RoomEntry | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

function touch(entry: RoomEntry): void {
  entry.lastActivity = Date.now();
}

// ---------------------------------------------------------------------------
// Roster mutations
// ---------------------------------------------------------------------------

/** Guarantee `hostId` points at a connected player. When the current host
 *  is gone (disconnected, or a stale record left behind after they dropped
 *  while alone), promote the longest-tenured connected player. Without this
 *  a room can be stranded with a disconnected host, leaving whoever is
 *  actually present unable to start a board. No-op while nobody is
 *  connected — the next joiner triggers promotion. */
function ensureConnectedHost(room: MultiplayerRoom): void {
  const host = room.players.find((p) => p.id === room.hostId);
  if (host?.connected) return;
  const successor = room.players
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (!successor) return;
  room.hostId = successor.id;
  for (const p of room.players) p.isHost = p.id === successor.id;
}

/** End the active board when no connected player is still playing, so a
 *  round doesn't hang waiting on someone who has finished or dropped. With a
 *  finite timer this also ends the round promptly instead of waiting out the
 *  clock once everyone present is done. Returns true if it finalized. */
function finalizeIfRoundComplete(entry: RoomEntry): boolean {
  const room = entry.room;
  if (room.status !== 'playing') return false;
  if (room.players.some((p) => p.status === 'playing' && p.connected)) return false;
  // If everyone left during the pre-board countdown, the round never actually
  // began — ending it would set endedAt < startedAt and drop the room onto a
  // dead, zero-score results screen for a board nobody could play. Abandon it
  // back to the lobby instead so the next start is clean.
  const board = room.currentBoard;
  if (board && Date.now() < board.startedAt) {
    cancelBoard(entry);
    return true;
  }
  endBoard(room.code); // clears the board timer internally
  return true;
}

/** Abandon the current board without scoring it and drop the room back to the
 *  lobby. Used when a round is orphaned during its countdown (everyone present
 *  left before play started), where finishing it would produce a phantom
 *  results round. */
function cancelBoard(entry: RoomEntry): void {
  const room = entry.room;
  if (entry.boardTimer) {
    clearTimeout(entry.boardTimer);
    entry.boardTimer = null;
  }
  room.currentBoard = null;
  room.status = 'lobby';
  entry.boardWords = [];
  for (const p of room.players) {
    if (p.status === 'playing' || p.status === 'finished') p.status = 'lobby';
  }
}

/** Add or reattach a player. `playerKey` is the client's private reconnect
 *  secret (from the handshake auth), never the public id. If the key maps
 *  to an existing player, treat it as a reconnect (preserve their score /
 *  found words) and just mark them connected and refresh their display name.
 *  Otherwise mint a fresh public id so the snapshot never carries the key. */
export function joinRoom(
  code: string,
  playerKey: string,
  displayName: string,
): { room: MultiplayerRoom; player: MultiplayerPlayer } | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;

  const existingId = entry.keyToPlayerId.get(playerKey);
  const existing = existingId ? room.players.find((p) => p.id === existingId) : undefined;
  if (existing) {
    entry.socketCounts.set(existing.id, (entry.socketCounts.get(existing.id) ?? 0) + 1);
    existing.connected = true;
    existing.left = false; // rejoining clears the departed flag
    existing.displayName = displayName || existing.displayName;
    // A reconnecting player may be the only live person in a room whose
    // host record is stale — make sure they can run it.
    ensureConnectedHost(room);
    touch(entry);
    return { room, player: existing };
  }

  // Joiners during an active board land in lobby status so they don't
  // get credit/penalty for the current round. They'll flip to 'playing'
  // when the host starts the next board. The id is a fresh random value,
  // distinct from the reconnect key, and is the only identifier ever
  // broadcast for this player.
  const player: MultiplayerPlayer = {
    id: randomUUID(),
    displayName: displayName || 'Player',
    isHost: false,
    joinedAt: Date.now(),
    status: 'lobby',
    points: 0,
    wordCount: 0,
    foundWords: [],
    connected: true,
    left: false,
  };

  entry.keyToPlayerId.set(playerKey, player.id);
  entry.socketCounts.set(player.id, 1);
  room.players.push(player);
  // First player, or first to arrive after the previous host dropped while
  // alone (which leaves a stale disconnected host) — take the room over.
  ensureConnectedHost(room);
  touch(entry);
  return { room, player };
}

export function disconnectPlayer(code: string, playerId: string): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;

  // One of possibly several sockets for this player closed. The player only
  // goes offline once the last one does — otherwise a second tab or an
  // overlapping reconnect would falsely drop them and move host controls.
  const remaining = (entry.socketCounts.get(playerId) ?? 1) - 1;
  if (remaining > 0) {
    entry.socketCounts.set(playerId, remaining);
    touch(entry);
    return entry.room;
  }
  entry.socketCounts.delete(playerId);

  const player = entry.room.players.find((p) => p.id === playerId);
  if (!player) return entry.room;
  player.connected = false;

  // If the host dropped, hand off to the longest-tenured connected player
  // so the lobby doesn't become unstartable.
  ensureConnectedHost(entry.room);

  // If this drop leaves no one still actively playing, finalize the board —
  // the only thing that ends a round once the last active player is gone.
  finalizeIfRoundComplete(entry);

  touch(entry);
  return entry.room;
}

export function leaveRoom(code: string, playerId: string): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;

  // Leaving is explicit and final: forget every socket this player held so a
  // trailing disconnect (or another open tab) can't keep them "present".
  entry.socketCounts.delete(playerId);

  // A player who leaves while a board they were part of is live or being
  // scored keeps their snapshot in the standings — they're marked as
  // departed instead of being deleted, so the results reflect everyone
  // who actually played. Anyone else (lobby-only, joined-but-sat-out)
  // is removed outright.
  const participated =
    !!room.currentBoard &&
    (player.status === 'playing' ||
      player.status === 'finished' ||
      player.points > 0 ||
      player.foundWords.length > 0);

  if (participated) {
    player.connected = false;
    player.left = true;
    // Freeze their score: a mid-board departure counts as finishing the
    // board where they stood.
    if (player.status === 'playing') player.status = 'finished';
  } else {
    room.players = room.players.filter((p) => p.id !== playerId);
  }

  // If nobody is left who could ever return (all remaining are departed
  // or the room is empty), tear it down so it doesn't linger.
  const livePlayers = room.players.filter((p) => !p.left);
  if (livePlayers.length === 0) {
    if (entry.boardTimer) clearTimeout(entry.boardTimer);
    rooms.delete(room.code);
    clearRoomNudges(room.code);
    return null;
  }

  // Hand the host role to the longest-tenured remaining live player.
  if (room.hostId === playerId) {
    const successor =
      livePlayers.filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt)[0] ??
      livePlayers[0];
    room.hostId = successor.id;
    for (const p of room.players) p.isHost = p.id === successor.id;
  }

  // If the departure means no one is still actively playing, finalize the
  // board so the remaining players aren't stuck waiting on someone who's
  // gone.
  finalizeIfRoundComplete(entry);

  touch(entry);
  return room;
}

// ---------------------------------------------------------------------------
// Config + board lifecycle
// ---------------------------------------------------------------------------

export function updateNextConfig(
  code: string,
  patch: Partial<GameConfig>,
): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  // Host-only authorization lives in the socket handler; validation lives
  // here so every config mutation — REST create or socket update — is
  // clamped at the same seam and an arbitrary host payload can't widen the
  // bounds.
  entry.room.nextConfig = { ...entry.room.nextConfig, ...sanitizeConfig(patch) };
  touch(entry);
  return entry.room;
}

export interface StartBoardResult {
  room: MultiplayerRoom;
  board: MultiplayerBoard;
}

export function startBoard(
  code: string,
  onAutoEnd: (room: MultiplayerRoom) => void,
): StartBoardResult | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;
  if (room.status === 'playing') return null;
  // Nobody connected to deal in — a stale/disconnected host firing start would
  // otherwise create a board with an empty participant set that lands straight
  // on an empty results screen. Refuse it.
  if (!room.players.some((p) => p.connected)) return null;

  const config = room.nextConfig;
  const seed = randomSeed();
  const grid = generateSeededBoard(config.boardSize, seed);
  const salt = generateSalt();
  const allWords = findAllWords(grid, dictionary, config.minWordLength);
  const wordHashes = allWords.map((w) => hashWord(w.word, salt));
  // Stash the plain word list server-side for the post-round results
  // endpoint (never broadcast — see RoomEntry.boardWords).
  entry.boardWords = allWords.map((w) => w.word);

  // Play starts after the shared countdown; the auto-end timer below is
  // pushed back by the same amount so the duration is unaffected.
  const startedAt = Date.now() + COUNTDOWN_MS;
  const board: MultiplayerBoard = {
    board: grid,
    seed,
    config,
    startedAt,
    endedAt: null,
    wordHashes,
    salt,
    totalFindable: allWords.length,
    participantIds: [],
  };
  room.currentBoard = board;
  room.status = 'playing';

  // Players who left during the previous round are gone for good — drop
  // them now that we're starting a fresh board so they don't carry into
  // the new round's standings.
  room.players = room.players.filter((p) => !p.left);

  // Reset per-board player state. Disconnected players stay in lobby so
  // they don't claim a slot in this round's standings. The set of players
  // dealt in (those flipped to 'playing') is recorded on the board so the
  // results screen can rank exactly this round's participants.
  for (const player of room.players) {
    player.points = 0;
    player.wordCount = 0;
    player.foundWords = [];
    player.status = player.connected ? 'playing' : 'lobby';
    if (player.status === 'playing') board.participantIds.push(player.id);
  }

  if (entry.boardTimer) clearTimeout(entry.boardTimer);
  if (config.durationSeconds > 0) {
    entry.boardTimer = setTimeout(() => {
      endBoard(code);
      const fresh = getEntry(code);
      if (fresh) onAutoEnd(fresh.room);
    }, COUNTDOWN_MS + config.durationSeconds * 1000);
  }

  touch(entry);
  return { room, board };
}

export function endBoard(code: string): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;
  if (room.status !== 'playing' || !room.currentBoard) return room;

  room.currentBoard.endedAt = Date.now();
  room.status = 'results';
  for (const player of room.players) {
    if (player.status === 'playing') player.status = 'finished';
  }
  if (entry.boardTimer) {
    clearTimeout(entry.boardTimer);
    entry.boardTimer = null;
  }

  updateLastRound(room);

  touch(entry);
  return room;
}

// Records the just-finished board's winner and extends or resets the
// win streak. A board only counts toward a streak if it had a clear
// single winner with a positive score — a 0-0 board or an exact tie
// breaks the streak rather than arbitrarily crediting someone.
function updateLastRound(room: MultiplayerRoom): void {
  const contenders = room.players
    .filter((p) => p.status === 'finished' && p.points > 0)
    .sort((a, b) => b.points - a.points);

  const top = contenders[0];
  const tie = contenders.length > 1 && contenders[1].points === top?.points;

  if (!top || tie) {
    room.lastRound = null;
    return;
  }

  const prior = room.lastRound;
  const streak = prior && prior.winnerId === top.id ? prior.streak + 1 : 1;
  room.lastRound = {
    winnerId: top.id,
    winnerName: top.displayName,
    points: top.points,
    wordCount: top.wordCount,
    streak,
  };
}

export function setVisibility(
  code: string,
  visibility: RoomVisibility,
): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  entry.room.visibility = visibility;
  touch(entry);
  return entry.room;
}

/** Full found-able word list for the current board — only once it has
 *  ended, so the dictionary is never exposed mid-game. Null while a board
 *  is live or absent. */
export function getEndedBoardWords(code: string): string[] | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const board = entry.room.currentBoard;
  if (!board || board.endedAt === null) return null;
  return entry.boardWords;
}

// ---------------------------------------------------------------------------
// Public discovery
// ---------------------------------------------------------------------------

/** Public rooms that have at least one connected player, summarized for the
 *  browse list. Ordered by player count (busiest first), then newest. */
export function listPublicRooms(): PublicRoomSummary[] {
  const summaries: Array<PublicRoomSummary & { createdAt: number }> = [];
  for (const entry of rooms.values()) {
    const room = entry.room;
    if (room.visibility !== 'public') continue;
    const connected = room.players.filter((p) => p.connected);
    if (connected.length === 0) continue;
    const host = room.players.find((p) => p.id === room.hostId);
    summaries.push({
      code: room.code,
      hostName: host?.displayName ?? 'Player',
      playerCount: connected.length,
      status: room.status,
      config: room.currentBoard?.config ?? room.nextConfig,
      createdAt: room.createdAt,
    });
  }
  summaries.sort((a, b) => b.playerCount - a.playerCount || b.createdAt - a.createdAt);
  return summaries.map(({ createdAt: _createdAt, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Nudges
// ---------------------------------------------------------------------------

const NUDGE_COOLDOWN_MS = 10_000;
// Last nudge time per `${code}:${playerId}`. Pruned when a room is torn down
// (see clearRoomNudges) so it tracks live rooms rather than growing for the
// process lifetime.
const nudgeTimes = new Map<string, number>();

/** Drop every nudge-cooldown entry for a room. Called wherever a room is
 *  deleted so the map doesn't accumulate keys for dead rooms. */
function clearRoomNudges(code: string): void {
  const prefix = `${code}:`;
  for (const key of nudgeTimes.keys()) {
    if (key.startsWith(prefix)) nudgeTimes.delete(key);
  }
}

export interface NudgeResult {
  allowed: boolean;
  hostId?: string;
  fromName?: string;
}

/** A non-host asks the host to get going. Enforces a per-player cooldown so
 *  the host can't be spammed, and returns who to notify. */
export function registerNudge(code: string, playerId: string): NudgeResult {
  const entry = getEntry(code);
  if (!entry) return { allowed: false };
  const room = entry.room;
  if (room.hostId === playerId) return { allowed: false }; // host can't nudge itself
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { allowed: false };

  const key = `${room.code}:${playerId}`;
  const now = Date.now();
  if (now - (nudgeTimes.get(key) ?? 0) < NUDGE_COOLDOWN_MS) return { allowed: false };
  nudgeTimes.set(key, now);
  touch(entry);
  return { allowed: true, hostId: room.hostId, fromName: player.displayName };
}

/** Total connected players across all public rooms (landing indicator). */
export function countPublicPlayers(): number {
  let total = 0;
  for (const entry of rooms.values()) {
    if (entry.room.visibility !== 'public') continue;
    total += entry.room.players.filter((p) => p.connected).length;
  }
  return total;
}

export function returnToLobby(code: string): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  // Keep currentBoard + per-player scores intact so the lobby's "Last
  // Round" card and its "See Results" link can still surface the board
  // that just finished. Both are reset when the next board starts.
  entry.room.status = 'lobby';
  for (const p of entry.room.players) p.status = 'lobby';
  touch(entry);
  return entry.room;
}

// ---------------------------------------------------------------------------
// Word submission
// ---------------------------------------------------------------------------

export interface SubmitResult {
  outcome:
    | { valid: true; word: string; score: number }
    | { valid: false; word?: string; reason: 'invalid' | 'repeat' | 'expired' };
  room: MultiplayerRoom;
}

export function submitWord(
  code: string,
  playerId: string,
  path: Position[],
): SubmitResult | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;
  const board = room.currentBoard;
  if (!board) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  // Players who joined mid-board sit in lobby status and never entered this
  // round — they can't submit until the next board starts. Only 'lobby' is
  // rejected outright here; a participant who is 'finished' is handled by
  // the grace logic below (otherwise the timer-expiry grace window — which
  // flips every active player to 'finished' — would be unreachable).
  if (player.status === 'lobby') {
    return { outcome: { valid: false, reason: 'expired' }, room };
  }

  // Reject anything submitted during the pre-board countdown — words only
  // count once startedAt passes.
  if (Date.now() < board.startedAt) {
    return { outcome: { valid: false, reason: 'expired' }, room };
  }

  if (board.endedAt === null) {
    // Board still live: a player who finished early (manual end) is done
    // and can't keep submitting.
    if (player.status !== 'playing') {
      return { outcome: { valid: false, reason: 'expired' }, room };
    }
  } else if (Date.now() - board.endedAt > GRACE_PERIOD_MS) {
    // Board ended: honour the same brief grace as solo for a word already
    // in flight when the timer fired, then reject. endBoard flips every
    // active player to 'finished', so this window is the only thing that
    // lets a just-submitted word still land.
    return { outcome: { valid: false, reason: 'expired' }, room };
  }

  if (!isValidPath(path, board.config.boardSize)) {
    return { outcome: { valid: false, reason: 'invalid' }, room };
  }
  const word = path
    .map((p) => board.board[p.row]?.[p.col] ?? '')
    .join('')
    .toUpperCase();

  if (word.length < board.config.minWordLength) {
    return { outcome: { valid: false, word, reason: 'invalid' }, room };
  }
  if (!isValidWord(dictionary, word.toLowerCase())) {
    return { outcome: { valid: false, word, reason: 'invalid' }, room };
  }
  if (player.foundWords.some((w) => w.toUpperCase() === word)) {
    return { outcome: { valid: false, word, reason: 'repeat' }, room };
  }

  const score = scoreWord(word);
  player.foundWords.push(word);
  player.points += score;
  player.wordCount += 1;
  touch(entry);
  return { outcome: { valid: true, word, score }, room };
}

export function markPlayerFinished(
  code: string,
  playerId: string,
): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const player = entry.room.players.find((p) => p.id === playerId);
  if (!player) return entry.room;
  if (player.status === 'playing') player.status = 'finished';

  // If every still-connected player has finished, finalize the board so
  // the room doesn't wait on a no-op timer. A disconnected player who's
  // still flagged 'playing' (closed their tab mid-round) doesn't block
  // the end — the server-side timer remains the backstop if they were
  // the last one.
  finalizeIfRoundComplete(entry);
  touch(entry);
  return entry.room;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/** Periodic sweep that drops rooms with no recent activity. Run at boot
 *  so idle rooms don't pile up forever in a long-lived process. */
export function startRoomCleanup(intervalMs = 15 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, entry] of rooms) {
      if (entry.lastActivity < cutoff) {
        if (entry.boardTimer) clearTimeout(entry.boardTimer);
        rooms.delete(code);
        clearRoomNudges(code);
      }
    }
  }, intervalMs);
}
