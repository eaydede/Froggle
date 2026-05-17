import { Router } from 'express';
import { getDb } from '../db/index.js';
import { noStore } from '../httpCache.js';

export const feedbackRouter = Router();

const MAX_LENGTH = 2000;

feedbackRouter.post('/', async (req, res) => {
  const { message } = req.body ?? {};

  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'message must be a string' });
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'message must not be empty' });
  }
  if (trimmed.length > MAX_LENGTH) {
    return res.status(400).json({ error: `message must be ${MAX_LENGTH} characters or fewer` });
  }

  try {
    const db = getDb();
    await db
      .insertInto('feedback')
      .values({
        user_id: req.userId ?? null,
        message: trimmed,
      })
      .execute();

    noStore(res);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});
