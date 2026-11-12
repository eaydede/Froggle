import { Router } from 'express';
import { getDb } from '../../../platform/database/index.js';
import { endpoint } from '../../../platform/errors.js';
import { cachePrivate } from '../../../platform/httpCache.js';
import { getLeaderboard } from './service.js';

export const leaderboardRouter = Router();
leaderboardRouter.get('/:date', endpoint(async (req, res) => {
  const result = await getLeaderboard(getDb(), req.params.date, req.userId);
  cachePrivate(res, 10);
  res.json(result);
}));
