import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { authMiddleware } from './middleware/auth.js';
import { sessionMiddleware, startSessionCleanup } from './session.js';
import { gameRouter } from './routes/game.js';
import { userRouter } from './routes/user.js';
import { dailyRouter } from './routes/daily.js';
import { dailyZenRouter } from './routes/dailyZen.js';
import { dailyGauntletRouter } from './routes/dailyGauntlet.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { freeplayRouter } from './routes/freeplay.js';
import { feedbackRouter } from './routes/feedback.js';
import { versionRouter } from './routes/version.js';
import { multiplayerRouter } from './routes/multiplayer.js';
import { attachMultiplayerSockets } from './multiplayer/sockets.js';
import { setBoardCompletionHandler, startRoomCleanup } from './multiplayer/store.js';
import { persistRoomBoardResults } from './services/FreePlayService.js';
import { getDb } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Auth middleware extracts user ID from Supabase JWT on all /api routes.
app.use('/api', authMiddleware);
app.use('/api', sessionMiddleware);

const clientDistPath = path.join(__dirname, '../client/dist');
const assetsSegment = `${path.sep}assets${path.sep}`;
app.use(
  express.static(clientDistPath, {
    setHeaders: (res, filepath) => {
      // Vite emits content-hashed filenames under /assets/, so they're safe to
      // cache forever. Everything else (index.html, favicon, etc.) must
      // revalidate or stale clients keep loading old bundle references.
      if (filepath.includes(assetsSegment)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

app.use('/api/game', gameRouter);
app.use('/api/user', userRouter);
app.use('/api/freeplay', freeplayRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/daily/leaderboard', leaderboardRouter);
app.use('/api/daily/zen', dailyZenRouter);
app.use('/api/daily/gauntlet', dailyGauntletRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/multiplayer', multiplayerRouter);
app.use('/api/version', versionRouter);

// SPA fallback for non-API routes
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

startSessionCleanup();
startRoomCleanup();

// Persist finished room boards into the same free_play_sessions history as
// solo free-play, so room games (solo or multi) show up in /history and can
// be promoted to async challenges. Injected here to keep the in-memory room
// store free of any database dependency.
setBoardCompletionHandler((completion) =>
  persistRoomBoardResults(getDb(), completion).catch((err) =>
    console.error('Failed to persist room board results:', err),
  ),
);

// Wrap Express in an HTTP server so Socket.io can attach to the same
// port — the multiplayer namespace shares the listener with the REST
// API to keep deployment configuration unchanged.
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
attachMultiplayerSockets(io);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
