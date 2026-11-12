import { Router } from 'express';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { endpoint } from '../../platform/errors.js';
import { cachePrivate, noStore } from '../../platform/httpCache.js';
import { getDailyDatePST } from '../timed-daily/config.js';
import { getTimeIsMoneyNumber } from './config.js';
import { solveBoard } from './puzzle.js';
import { resultRouter } from './results/api.js';
import { endTimeIsMoneySession, getTimeIsMoneyCompare, getTimeIsMoneySession, getTimeIsMoneyStatus, startTimeIsMoneySession, submitTimeIsMoneyWord } from './service.js';

export const dailyTimeIsMoneyRouter = Router();

// Landing payload: today's date + puzzle number + the player's state.
dailyTimeIsMoneyRouter.get('/status', requireAuth, endpoint(async (req, res) => {

  const date = getDailyDatePST();
  const status = await getTimeIsMoneyStatus(getDb(), req.userId!, date);
  noStore(res);
  res.json({ date, number: getTimeIsMoneyNumber(date), ...status });

}));

// Resume: the player's session for the date, or null.
dailyTimeIsMoneyRouter.get('/session/:date', requireAuth, endpoint(async (req, res) => {

  const session = await getTimeIsMoneySession(getDb(), req.userId!, req.params.date);
  if (!session) {
    noStore(res);
    return res.json({ session: null });
  }
  noStore(res);
  res.json({
    session: {
      ...session,
      ...solveBoard(req.params.date, session.board, session.min_word_length),
      server_now: Date.now(),
    },
  });

}));

dailyTimeIsMoneyRouter.post('/session/:date/start', requireAuth, endpoint(async (req, res) => {

  const date = req.params.date;
  if (date !== getDailyDatePST()) {
    return res.status(400).json({ error: "Can only start today's Time is Money session" });
  }
  const session = await startTimeIsMoneySession(getDb(), req.userId!, date);
  noStore(res);
  res.json({
    session: { ...session, ...solveBoard(date, session.board, session.min_word_length), server_now: Date.now() },
  });

}));

dailyTimeIsMoneyRouter.post('/session/:date/word', requireAuth, endpoint(async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) return res.status(400).json({ error: 'Missing path' });

  const outcome = await submitTimeIsMoneyWord(getDb(), req.userId!, req.params.date, path);
  noStore(res);
  res.json(outcome);

}));

dailyTimeIsMoneyRouter.post('/session/:date/end', requireAuth, endpoint(async (req, res) => {

  const session = await endTimeIsMoneySession(getDb(), req.userId!, req.params.date);
  if (!session) return res.status(404).json({ error: 'No session to end' });
  noStore(res);
  res.json({ session });

}));

// Side-by-side comparison of two finalized runs. Mirrors the timed and zen
// daily compare endpoints' status codes so the client shares its fetch/error
// machinery.
dailyTimeIsMoneyRouter.get('/compare/:date', requireAuth, endpoint(async (req, res) => {
  const otherUserId = typeof req.query.other === 'string' ? req.query.other : '';
  if (!otherUserId) {
    return res.status(400).json({ error: 'Missing query param: other' });
  }

  const result = await getTimeIsMoneyCompare(getDb(), req.params.date, req.userId!, otherUserId);
  if (result.ok) {
    cachePrivate(res, 30);
    return res.json(result.data);
  }
  if (result.error === 'unplayed') return res.status(409).json({ error: 'You have not finished this Time is Money daily yet' });
  if (result.error === 'opponent-missing') return res.status(404).json({ error: 'Opponent has not finished this Time is Money daily' });
  return res.status(400).json({ error: 'Cannot compare with yourself' });

}));

dailyTimeIsMoneyRouter.use(resultRouter);
