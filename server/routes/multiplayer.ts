import { Router } from 'express';
import {
  awaitBoardPersistence,
  countPublicPlayers,
  createRoom,
  getEndedBoardWords,
  getRoom,
  listPublicRooms,
} from '../multiplayer/store.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { shareRoomBoardChallenge } from '../services/FreePlayService.js';

export const multiplayerRouter = Router();

// Browse list of joinable public rooms + the total player count. Mounted
// above `/rooms/:code` so the literal path isn't captured by the param.
multiplayerRouter.get('/public', (_req, res) => {
  res.json({ rooms: listPublicRooms(), totalPlayers: countPublicPlayers() });
});

multiplayerRouter.post('/rooms', (req, res) => {
  const room = createRoom({ config: req.body?.config });
  res.json({ room });
});

// Full word list for the current board — only returned once the board has
// ended, so the results page can show missed words without ever leaking
// the dictionary mid-game.
multiplayerRouter.get('/rooms/:code/words', (req, res) => {
  const words = getEndedBoardWords(req.params.code);
  res.json({ words: words ?? [] });
});

multiplayerRouter.get('/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'not-found' });
    return;
  }
  res.json({ room });
});

// Promote the caller's result on the room's most recent board into a
// shareable async challenge. The board's results are written to
// free_play_sessions when it ends, so this reuses the exact same challenge
// model (and recipient flow) as solo free-play — recipients play the same
// seeded board on their own time and land on the shared leaderboard.
multiplayerRouter.post('/rooms/:code/share', requireAuth, async (req, res) => {
  const room = getRoom(req.params.code);
  if (!room || !room.currentBoard || room.currentBoard.endedAt === null) {
    res.status(409).json({ error: 'No finished board to share' });
    return;
  }
  try {
    // The board's history rows are written fire-and-forget when it ends; wait
    // for that write so the row is promotable the instant results show.
    await awaitBoardPersistence(req.params.code);
    const board = room.currentBoard;
    const shared = await shareRoomBoardChallenge(getDb(), req.userId!, {
      seed: board.seed,
      boardSize: board.config.boardSize,
    });
    if (!shared) {
      res.status(404).json({ error: 'No result to share' });
      return;
    }
    res.json(shared);
  } catch (err) {
    console.error('Failed to share room challenge:', err);
    res.status(500).json({ error: 'Failed to share' });
  }
});
