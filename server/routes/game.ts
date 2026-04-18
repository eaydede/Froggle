import { Router } from 'express';
import { createSession, destroySession, getSession, getRequestSessionId } from '../session.js';

export const gameRouter = Router();

gameRouter.post('/create', (_req, res) => {
  const { sessionId, controller } = createSession();
  const game = controller.createGame();
  res.json({ game, sessionId });
});

gameRouter.post('/start', (req, res) => {
  const session = getSession(getRequestSessionId(req));
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const { durationSeconds, boardSize, minWordLength, board, seed } = req.body;
  try {
    const result = session.controller.startGame(
      durationSeconds || 180,
      boardSize || 4,
      minWordLength || 3,
      board,
      seed,
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

gameRouter.post('/cancel', (req, res) => {
  const sessionId = getRequestSessionId(req);
  const session = getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  session.controller.cancelGame();
  destroySession(sessionId);
  res.json({ success: true });
});

gameRouter.post('/end', (req, res) => {
  const session = getSession(getRequestSessionId(req));
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const game = session.controller.endGame();
  if (game) {
    res.json({ game });
    return;
  }
  const state = session.controller.getGameState();
  if (state.game) {
    res.json({ game: state.game });
  } else {
    res.status(400).json({ error: 'No active game to end' });
  }
});

gameRouter.post('/submit', (req, res) => {
  const session = getSession(getRequestSessionId(req));
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const result = session.controller.submitWord(req.body.path);
  res.json(result);
});

gameRouter.get('/state', (req, res) => {
  const session = getSession(getRequestSessionId(req));
  if (!session) return res.json({ game: null, words: [] });

  res.json(session.controller.getGameState());
});

gameRouter.get('/results', (req, res) => {
  const session = getSession(getRequestSessionId(req));
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const results = session.controller.getResults();
  if (results) {
    res.json(results);
  } else {
    res.status(400).json({ error: 'No finished game' });
  }
});
