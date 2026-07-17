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
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { validateSubmission } from 'engine/submission.js';
import { hashWord, generateSalt, type Position, type GameConfig, type InvalidSubmission } from 'models';
import { randomSeed } from 'models/seedCode';
import type {
  MultiplayerBoard,
  MultiplayerPlayer,
  MultiplayerRoom,
  PublicRoomSummary,
  RoomVisibility,
} from 'models/multiplayer';
import { dictionary } from '../services/dictionary.js';
import { scoreResult } from '../services/DailyService.js';
import { elapsedSeconds } from '../services/wordTiming.js';
import { appendInvalidSubmission } from '../services/invalidSubmissions.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/I/O ambiguity
const ROOM_CODE_LENGTH = 5;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h after last activity → purged

const DEFAULT_CONFIG: GameConfig = {
  durationSeconds: 60,
  boardSize: 4,
  minWordLength: 3,
};

const GRACE_PERIOD_MS = 500;
// A board's startedAt is set this far in the future so every client gets a
// shared "get ready" countdown before words count — nobody is dropped onto
// a live board with no warning. The play window (duration) begins at
// startedAt, so the countdown doesn't eat into anyone's time.
const COUNTDOWN_MS = 3000;
// A solo player can fast-forward their own pre-board countdown a step at a
// time (tap to start sooner); each advance pulls the start — and the matching
// auto-end — this much earlier.
const COUNTDOWN_STEP_MS = 1000;

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

const rooms = new Map<string, RoomEntry>();

// ---------------------------------------------------------------------------
// History persistence sink
//
// The store stays free of any DB dependency — index.ts wires the handler at
// boot. When a board ends, the room hands its per-player results to the sink,
// which writes them into the same free_play_sessions history as solo
// free-play. That makes room games (solo or multi) appear in /history and
// promotable to async challenges through the existing infrastructure.
// ---------------------------------------------------------------------------

/** A finished board's per-player results, handed to the persistence sink. */
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
    foundWordTimes: number[];
    invalidSubmissions: InvalidSubmission[];
    points: number;
    wordCount: number;
    longestWord: string;
  }>;
}

type BoardCompletionHandler = (completion: RoomBoardCompletion) => Promise<void> | void;
let boardCompletionHandler: BoardCompletionHandler | null = null;

/** Register the sink that persists a finished board's results. Called once at
 *  server boot — kept as an injected callback so the in-memory store never
 *  imports the database layer. */
export function setBoardCompletionHandler(handler: BoardCompletionHandler): void {
  boardCompletionHandler = handler;
}

/** Await the persistence write for the room's most recently ended board (if
 *  any). Lets the challenge-share endpoint guarantee the history row exists
 *  before it tries to promote it. */
export async function awaitBoardPersistence(code: string): Promise<void> {
  const entry = getEntry(code);
  if (entry?.lastPersistence) await entry.lastPersistence;
}

function longestOf(words: string[]): string {
  let longest = '';
  for (const w of words) if (w.length > longest.length) longest = w;
  return longest;
}

// Persisting a finished board is deferred until the post-end grace window
// closes. submitWord keeps accepting a valid word for GRACE_PERIOD_MS after a
// board ends (so a final word already in flight when the timer fired still
// counts toward the round) — snapshotting at the instant of ending would write
// the history row and shared challenge before that word lands, leaving them a
// word short of the live room results. The extra margin guarantees a word
// accepted at the very edge of the grace window is included before we read.
const PERSIST_DELAY_MS = GRACE_PERIOD_MS + 50;

/** Snapshot the just-ended board's per-player results, keyed to each player's
 *  authenticated user id. Players the server couldn't authenticate are skipped
 *  — their scores still live in the room snapshot, they just don't write
 *  history. Returns null when nobody has a row to persist. */
function buildCompletion(entry: RoomEntry, board: MultiplayerBoard): RoomBoardCompletion | null {
  const participants: RoomBoardCompletion['participants'] = [];
  for (const id of board.participantIds) {
    const userId = entry.userIds.get(id);
    if (!userId) continue;
    const player = entry.room.players.find((p) => p.id === id);
    if (!player) continue;
    participants.push({
      userId,
      foundWords: [...player.foundWords],
      foundWordTimes: [...player.foundWordTimes],
      invalidSubmissions: [...player.invalidSubmissions],
      points: player.points,
      wordCount: player.wordCount,
      longestWord: longestOf(player.foundWords),
    });
  }
  if (participants.length === 0) return null;
  return {
    seed: board.seed,
    board: board.board,
    config: board.config,
    startedAt: board.startedAt,
    endedAt: board.endedAt!,
    hostUserId: entry.currentBoardHostUserId,
    participants,
  };
}

/** Schedule the deferred history write for the board that just ended. The
 *  write runs once the grace window closes, or earlier if flushed (e.g. by
 *  startBoard before it resets player state). `lastPersistence` resolves only
 *  after the write settles, so the share endpoint can await a real row. */
function schedulePersistence(entry: RoomEntry): void {
  // A prior board's write should already have flushed; clear any leftover
  // timer defensively so two pending writes can't overlap.
  if (entry.persistTimer) clearTimeout(entry.persistTimer);
  entry.persistTimer = null;
  entry.flushPersistence = null;

  const handler = boardCompletionHandler;
  const board = entry.room.currentBoard;
  if (!handler || !board || board.endedAt === null) {
    entry.lastPersistence = null;
    return;
  }

  let settle!: () => void;
  entry.lastPersistence = new Promise<void>((resolve) => {
    settle = resolve;
  });

  let done = false;
  const flush = () => {
    if (done) return;
    done = true;
    if (entry.persistTimer) clearTimeout(entry.persistTimer);
    entry.persistTimer = null;
    entry.flushPersistence = null;
    const completion = buildCompletion(entry, board);
    if (!completion) {
      settle();
      return;
    }
    Promise.resolve(handler(completion)).then(settle, settle);
  };

  entry.flushPersistence = flush;
  entry.persistTimer = setTimeout(flush, PERSIST_DELAY_MS);
}

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
    userIds: new Map(),
    lastPersistence: null,
    persistTimer: null,
    flushPersistence: null,
    currentBoardHostUserId: null,
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
  userId: string | null,
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
    if (userId) entry.userIds.set(existing.id, userId);
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
    foundWordTimes: [],
    invalidSubmissions: [],
    connected: true,
    left: false,
  };

  entry.keyToPlayerId.set(playerKey, player.id);
  entry.socketCounts.set(player.id, 1);
  if (userId) entry.userIds.set(player.id, userId);
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
    // Flush any pending history write before the room (and its player data)
    // is dropped, so the last board the departing player finished still lands.
    entry.flushPersistence?.();
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

  // The previous board's history write may still be waiting out its grace
  // window. Flush it now — the reset below zeroes per-player found words, so a
  // deferred snapshot taken afterwards would persist an empty board.
  entry.flushPersistence?.();

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
  // Capture the round's host now (the prior board's pending write already
  // flushed above, so this can't clobber it). Reading it at the deferred write
  // instead would misattribute the shared challenge to a successor promoted by
  // host transfer during the grace window.
  entry.currentBoardHostUserId = entry.userIds.get(room.hostId) ?? null;

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
    player.foundWordTimes = [];
    player.invalidSubmissions = [];
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

/** Pull the pre-board countdown earlier by one step so a solo player can start
 *  their own round sooner. Solo-only: rushing a shared countdown isn't one
 *  player's call, so this no-ops the moment a second player is connected. The
 *  auto-end timer is re-pinned to the new start, keeping the play window equal
 *  to the configured duration. Returns the room when it advanced, else null. */
export function advanceCountdown(
  code: string,
  playerId: string,
  onAutoEnd: (room: MultiplayerRoom) => void,
): MultiplayerRoom | null {
  const entry = getEntry(code);
  if (!entry) return null;
  const room = entry.room;
  const board = room.currentBoard;
  if (room.status !== 'playing' || !board) return null;
  if (room.hostId !== playerId) return null;
  // Solo only — a second connected player means the countdown is shared and no
  // single player gets to cut it short.
  if (room.players.filter((p) => p.connected).length > 1) return null;
  const now = Date.now();
  if (now >= board.startedAt) return null; // countdown already elapsed

  // Clamp so play never starts in the past.
  board.startedAt = Math.max(now, board.startedAt - COUNTDOWN_STEP_MS);

  // Re-pin the auto-end to the new start so the play window is unchanged.
  if (entry.boardTimer) clearTimeout(entry.boardTimer);
  entry.boardTimer = null;
  if (board.config.durationSeconds > 0) {
    const endAt = board.startedAt + board.config.durationSeconds * 1000;
    entry.boardTimer = setTimeout(() => {
      endBoard(code);
      const fresh = getEntry(code);
      if (fresh) onAutoEnd(fresh.room);
    }, Math.max(0, endAt - now));
  }

  touch(entry);
  return room;
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
  // Defer the history write past the grace window — a final word may still
  // land in submitWord for GRACE_PERIOD_MS after this point.
  schedulePersistence(entry);

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

  // The validate/derive/dedupe/score middle is the shared engine core; the
  // multiplayer-specific gating (lobby/countdown/grace) above and the in-memory
  // mutation below stay here. The rejected word is surfaced so the client can
  // show it in the "not a word" toast.
  const result = validateSubmission(path, {
    board: board.board,
    foundWords: player.foundWords,
    boardSize: board.config.boardSize,
    minWordLength: board.config.minWordLength,
    dictionary,
    scoreWord,
    score: scoreResult,
  });
  if (!result.valid) {
    // Record the rejected attempt for the results timeline. Mutation only — the
    // socket layer skips the broadcast on invalid submits, so this doesn't bloat
    // per-word snapshots; it rides the board-end broadcast + persistence.
    player.invalidSubmissions = appendInvalidSubmission(player.invalidSubmissions, {
      word: result.word ?? '',
      reason: result.reason,
      t: elapsedSeconds(new Date(board.startedAt)),
      path,
    });
    return { outcome: { valid: false, word: result.word, reason: result.reason }, room };
  }

  player.foundWords.push(result.word);
  player.foundWordTimes.push(elapsedSeconds(new Date(board.startedAt)));
  player.points = result.aggregate.points;
  player.wordCount = result.aggregate.wordCount;
  touch(entry);
  return { outcome: { valid: true, word: result.word, score: result.score }, room };
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
        if (entry.persistTimer) clearTimeout(entry.persistTimer);
        rooms.delete(code);
        clearRoomNudges(code);
      }
    }
  }, intervalMs);
}
