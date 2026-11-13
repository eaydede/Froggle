import type {
  MultiplayerBoard
} from 'models/multiplayer';
import { GRACE_PERIOD_MS } from './config.js';
import { findEntry } from './repository.js';
import type { BoardCompletionHandler, RoomBoardCompletion, RoomEntry } from './types.js';
let boardCompletionHandler: BoardCompletionHandler | null = null;

export function setBoardCompletionHandler(handler: BoardCompletionHandler): void {
  boardCompletionHandler = handler;
}

export async function awaitBoardPersistence(code: string): Promise<void> {
  const entry = findEntry(code);
  if (entry?.lastPersistence) await entry.lastPersistence;
}

function longestOf(words: string[]): string {
  let longest = '';
  for (const w of words) if (w.length > longest.length) longest = w;
  return longest;
}

const PERSIST_DELAY_MS = GRACE_PERIOD_MS + 50;

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
      wordTimes: { ...player.wordTimes },
      finishedAt: player.finishedAt,
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

export function schedulePersistence(entry: RoomEntry): void {
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
