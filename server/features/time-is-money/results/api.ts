import { Router } from 'express';
import { requireAuth } from '../../../platform/auth.js';
import { getDb } from '../../../platform/database/index.js';
import { endpoint } from '../../../platform/errors.js';
import { noStore } from '../../../platform/httpCache.js';
import * as service from './service.js';

export const resultRouter = Router();

resultRouter.get('/results/:date', requireAuth, endpoint(async (req, res) => {
  const payload = await service.getResult(getDb(), req.userId!, req.params.date);
  noStore(res);
  res.json(payload);
}));
