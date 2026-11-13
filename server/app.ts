import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { challengeRouter } from './features/challenges/api.js';
import { resultsRouter } from './features/results/api.js';
import { feedbackRouter } from './features/feedback/api.js';
import { gameRouter } from './features/free-play/api.js';
import { dailyGauntletRouter } from './features/gauntlet/api.js';
import { freeplayRouter } from './features/history/api.js';
import { userRouter } from './features/profile/api.js';
import { multiplayerRouter } from './features/rooms/api.js';
import { dailyTimeIsMoneyRouter } from './features/time-is-money/api.js';
import { dailyRouter } from './features/timed-daily/api.js';
import { leaderboardRouter } from './features/timed-daily/leaderboard/api.js';
import { versionRouter } from './features/version/api.js';
import { dailyZenRouter } from './features/zen/api.js';
import { authMiddleware } from './platform/auth.js';
import { handleError } from './platform/errors.js';

const clientDist = fileURLToPath(new URL('../client/dist', import.meta.url));

export function createApplication() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', authMiddleware);
  app.use('/api/results', resultsRouter);
  app.use('/api/game', gameRouter);
  app.use('/api/user', userRouter);
  app.use('/api/freeplay', freeplayRouter, challengeRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/daily/leaderboard', leaderboardRouter);
  app.use('/api/daily/zen', dailyZenRouter);
  app.use('/api/daily/gauntlet', dailyGauntletRouter);
  app.use('/api/daily/time-is-money', dailyTimeIsMoneyRouter);
  app.use('/api/daily', dailyRouter);
  app.use('/api/multiplayer', multiplayerRouter);
  app.use('/api/version', versionRouter);
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
  app.use(express.static(clientDist, {
    setHeaders(res, file) {
      res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`)
        ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  app.get('*', (_req, res) => { res.set('Cache-Control', 'no-cache').sendFile(path.join(clientDist, 'index.html')); });
  app.use(handleError);
  return app;
}
