import { Router } from 'express';
import { requireAuth } from '../../../platform/auth.js';
import { getDb } from '../../../platform/database/index.js';
import { endpoint } from '../../../platform/errors.js';
import { cachePrivate, noStore } from '../../../platform/httpCache.js';
import * as service from './service.js';

export const resultRouter = Router();

resultRouter.get('/results/:date', requireAuth, endpoint(async (req, res) => {
  const payload = await service.getResult(getDb(), req.userId!, req.params.date);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 60);
  res.json(payload);
}));

resultRouter.get('/compare/:date', requireAuth, endpoint(async (req, res) => {
  const { date } = req.params;
  const otherUserId = typeof req.query.other === 'string' ? req.query.other : '';
  const meUserId = req.userId!;

  if (!otherUserId) {
    return res.status(400).json({ error: 'Missing query param: other' });
  }
  if (otherUserId === meUserId) {
    return res.status(400).json({ error: 'Cannot compare with yourself' });
  }
  const payload = await service.comparePlayers(getDb(), req.userId!, req.params.date, otherUserId);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 30);
  res.json(payload);
}));

resultRouter.get('/history', requireAuth, endpoint(async (req, res) => {
  const payload = await service.getHistory(getDb(), req.userId!);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 60);
  res.json(payload);
}));
