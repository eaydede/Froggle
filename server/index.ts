import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GameController } from './GameController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the client build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Session management
const sessions = new Map<string, { controller: GameController; lastActivity: number }>();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

function generateSessionId(): string {
  return crypto.randomUUID();
}

function getSession(sessionId: string | undefined): { controller: GameController; lastActivity: number } | null {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastActivity = Date.now();
  return session;
}

// Periodically clean up stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      session.controller.cancelGame();
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Middleware to extract session ID from header
function sessionMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  (req as any).sessionId = req.headers['x-session-id'] as string | undefined;
  next();
}

app.use('/api', sessionMiddleware);

// Create a new game (in Config state)
app.post('/api/game/create', (req, res) => {
  const sessionId = generateSessionId();
  const controller = new GameController();
  const game = controller.createGame();
  sessions.set(sessionId, { controller, lastActivity: Date.now() });
  res.json({ game, sessionId });
});

// Start the game (transition from Config to InProgress)
app.post('/api/game/start', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const { durationSeconds, boardSize, minWordLength } = req.body;
  try {
    const game = session.controller.startGame(
      durationSeconds || 180, 
      boardSize || 4, 
      minWordLength || 3
    );
    res.json({ game });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Cancel the game in any state (Config or InProgress)
app.post('/api/game/cancel', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  session.controller.cancelGame();
  sessions.delete((req as any).sessionId);
  res.json({ success: true });
});

// End game early (transition to Finished state, keep words)
app.post('/api/game/end', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const game = session.controller.endGame();
  if (game) {
    res.json({ game });
  } else {
    const state = session.controller.getGameState();
    if (state.game) {
      res.json({ game: state.game });
    } else {
      res.status(400).json({ error: 'No active game to end' });
    }
  }
});

// Submit a word
app.post('/api/game/submit', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const { path } = req.body;
  const result = session.controller.submitWord(path);
  res.json(result);
});

// Get current game state
app.get('/api/game/state', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.json({ game: null, words: [] });

  const state = session.controller.getGameState();
  res.json(state);
});

// Get results after game ends
app.get('/api/game/results', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const results = session.controller.getResults();
  if (results) {
    res.json(results);
  } else {
    res.status(400).json({ error: 'No finished game' });
  }
});

// Serve client for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
