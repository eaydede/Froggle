import { Router } from 'express';
import { requireAuth } from '../../platform/auth.js';
import { ApplicationError, endpoint } from '../../platform/errors.js';
import { cachePrivate, noStore } from '../../platform/httpCache.js';
import { changeName, getProfile } from './service.js';

export const userRouter = Router();
userRouter.get('/me', requireAuth, (req, res) => { res.json({ id: req.userId }); });
userRouter.get('/profile', requireAuth, endpoint(async (req, res) => {
  const profile = await getProfile(req.userId!);
  cachePrivate(res, 60);
  res.json(profile);
}));
userRouter.put('/profile', requireAuth, endpoint(async (req, res) => {
  const name = req.body?.display_name;
  if (typeof name !== 'string' || !name.trim()) throw new ApplicationError('invalid', 'display_name must be a non-empty string');
  const result = await changeName(req.userId!, name);
  noStore(res);
  if (!result.ok) res.status(403).json({ error: 'name_locked', locked_until: result.lockedUntil });
  else res.json(result.profile);
}));
