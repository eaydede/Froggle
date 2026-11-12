import { Router } from 'express';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { endpoint } from '../../platform/errors.js';
import { cachePrivate } from '../../platform/httpCache.js';
import { getChallenge, getChallengePreview, getParticipation, shareResult } from './service.js';

export const challengeRouter = Router();
const router = challengeRouter;

router.post('/share/:sessionId', requireAuth, endpoint(async (req, res) => {
  res.json(await shareResult(getDb(), req.userId!, req.params.sessionId));
}));

router.get('/challenge/:challengeId/me', requireAuth, endpoint(async (req, res) => {
  res.json(await getParticipation(getDb(), req.userId!, req.params.challengeId));
}));

router.get('/challenge/:challengeId/preview', requireAuth, endpoint(async (req, res) => {
  res.json(await getChallengePreview(getDb(), req.userId!, req.params.challengeId));
}));

router.get('/challenge/:challengeId', requireAuth, endpoint(async (req, res) => {
  cachePrivate(res, 15);
  res.json(await getChallenge(getDb(), req.userId!, req.params.challengeId));
}));
