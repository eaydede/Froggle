import { Router } from 'express';
import { getDb } from '../../platform/database/index.js';
import { ApplicationError, endpoint } from '../../platform/errors.js';
import { noStore } from '../../platform/httpCache.js';
import { sendFeedback } from './service.js';

export const feedbackRouter = Router();
feedbackRouter.post('/', endpoint(async (req, res) => {
  const message = req.body?.message;
  if (typeof message !== 'string') throw new ApplicationError('invalid', 'message must be a string');
  await sendFeedback(getDb(), req.userId ?? null, message);
  noStore(res);
  res.json({ ok: true });
}));
