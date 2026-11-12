import { Router } from 'express';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { endpoint } from '../../platform/errors.js';
import { cachePrivate } from '../../platform/httpCache.js';
import { getHistory, getSavedResult, getUnread } from './service.js';

export const freeplayRouter = Router();
const router = freeplayRouter;

router.get('/history', requireAuth, endpoint(async (req, res) => {
  cachePrivate(res, 30);
  res.json(await getHistory(getDb(), req.userId!));
}));

router.get('/unread', requireAuth, endpoint(async (req, res) => {
  cachePrivate(res, 15);
  res.json(await getUnread(getDb(), req.userId!));
}));

router.get('/session/:sessionId', requireAuth, endpoint(async (req, res) => {
  cachePrivate(res, 60);
  res.json(await getSavedResult(getDb(), req.userId!, req.params.sessionId));
}));
