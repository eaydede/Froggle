import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';
import { sessionMiddleware, startSessionCleanup } from './session.js';
import { gameRouter } from './routes/game.js';
import { userRouter } from './routes/user.js';
import { dailyRouter } from './routes/daily.js';
import { dailyRelaxedRouter } from './routes/dailyRelaxed.js';
import { leaderboardRouter } from './routes/leaderboard.js';

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
app.use(express.static(clientDistPath));

app.use('/api/game', gameRouter);
app.use('/api/user', userRouter);
app.use('/api/daily/leaderboard', leaderboardRouter);
app.use('/api/daily/relaxed', dailyRelaxedRouter);
app.use('/api/daily', dailyRouter);

// SPA fallback for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

startSessionCleanup();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
