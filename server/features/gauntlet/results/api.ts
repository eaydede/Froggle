import { Router } from 'express';
import { requireAuth } from '../../../platform/auth.js';
import { getDb } from '../../../platform/database/index.js';
import { endpoint } from '../../../platform/errors.js';
import { cachePrivate, noStore } from '../../../platform/httpCache.js';
import * as service from './service.js';

export const resultRouter = Router();
function parseRoundIndex(raw: string): number | null {
  const round = Number(raw);
  return Number.isInteger(round) && round >= 0 && round < 3 ? round : null;
}

resultRouter.get('/:date/round/:round/results', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const payload = await service.getRoundResult(getDb(), req.userId!, req.params.date, roundIndex);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 60);
  res.json(payload);
}));

resultRouter.get('/:date/leaderboard', requireAuth, endpoint(async (req, res) => {
  const payload = await service.getStandings(getDb(), req.userId!, req.params.date);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 30);
  res.json(payload);
}));

resultRouter.get('/:date/round/:round/compare', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const { date } = req.params;
  const otherUserId = typeof req.query.other === 'string' ? req.query.other : '';
  const meUserId = req.userId!;
  if (!otherUserId) {
    return res.status(400).json({ error: 'Missing query param: other' });
  }
  if (otherUserId === meUserId) {
    return res.status(400).json({ error: 'Cannot compare with yourself' });
  }
  const payload = await service.comparePlayers(getDb(), req.userId!, req.params.date, roundIndex, otherUserId);
  if ('result' in payload && payload.result === null) noStore(res);
  else cachePrivate(res, 30);
  res.json(payload);
}));
