import { Router } from 'express';
import {
  countPublicPlayers,
  createRoom,
  getEndedBoardWords,
  getRoom,
  listPublicRooms,
} from '../multiplayer/store.js';

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
