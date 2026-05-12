import { Router } from 'express';
import { GameState } from 'models';
import { createSession, destroySession, getSession, getRequestSessionId, type Session } from '../session.js';
import { getDb } from '../db/index.js';
import { recordFreePlayCompletion } from '../services/FreePlayService.js';

export const gameRouter = Router();

// Writes one history row per completed free-play game. Idempotent across
// /end and /results — whichever the client hits first records the row;
// subsequent calls early-return on the freePlayRecorded flag. The actual
// DB insert is fire-and-forget so a transient failure can't break the
// response the client is waiting on.
function recordIfFinishedOnce(session: Session, userId: string | null): void {
  if (session.freePlayRecorded) return;
  const { game, words } = session.controller.getGameState();
  if (!game || game.status !== GameState.Finished) return;
  session.freePlayRecorded = true;
  recordFreePlayCompletion(getDb(), {
    userId,
    board: game.board,
    foundWords: words.map((w) => w.word),
    timeLimit: game.config.durationSeconds,
    boardSize: game.config.boardSize,
    minWordLength: game.config.minWordLength,
  }).catch((err) => {
    console.warn('Failed to record free-play completion:', (err as Error).message);
  });
}

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
    recordIfFinishedOnce(session, req.userId ?? null);
    return;
  }
  const state = session.controller.getGameState();
  if (state.game) {
    res.json({ game: state.game });
    recordIfFinishedOnce(session, req.userId ?? null);
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
    recordIfFinishedOnce(session, req.userId ?? null);
  } else {
    res.status(400).json({ error: 'No finished game' });
  }
});
