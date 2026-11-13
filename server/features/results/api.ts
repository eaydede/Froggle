import { Router } from 'express';
import type { ResultsSource } from 'models/results';
import { GAUNTLET_ROUND_COUNT } from 'models/gauntlet';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { ApplicationError, endpoint } from '../../platform/errors.js';
import { cachePrivate } from '../../platform/httpCache.js';
import { getInsights } from './service.js';

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export function parseSource(query: Record<string, unknown>): ResultsSource {
  const { mode, date, sessionId, code, playerId } = query;
  if (mode === 'freeplay' && typeof sessionId === 'string' && UUID.test(sessionId))
    return { mode, sessionId };
  if (
    mode === 'room' &&
    typeof code === 'string' &&
    /^[A-Z0-9]{4,8}$/i.test(code) &&
    typeof playerId === 'string' &&
    UUID.test(playerId)
  )
    return { mode, code, playerId };
  if (
    (mode === 'timed' || mode === 'zen' || mode === 'money' || mode === 'gauntlet') &&
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    if (mode !== 'gauntlet') return { mode, date };
    const round =
      typeof query.round === 'string' && /^\d+$/.test(query.round) ? Number(query.round) : NaN;
    if (Number.isInteger(round) && round >= 0 && round < GAUNTLET_ROUND_COUNT)
      return { mode, date, round };
  }
  throw new ApplicationError('invalid', 'Invalid results source');
}
export const resultsRouter = Router();
resultsRouter.get(
  '/insights',
  requireAuth,
  endpoint(async (req, res) => {
    const source = parseSource(req.query);
    const insights = await getInsights(getDb(), req.userId!, source);
    cachePrivate(res, 30);
    res.json(insights);
  }),
);
