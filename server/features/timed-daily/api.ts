import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { Router } from 'express';
import { generateSalt, hashWord } from 'models';
import { getDailySeed } from 'models/seedCode';
import { dictionary } from '../../gameplay/dictionary.js';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { endpoint } from '../../platform/errors.js';
import { cachePrivate, cachePublic, noStore } from '../../platform/httpCache.js';
import { getDailyStats } from '../daily-history/service.js';
import { DAILY_LAUNCH_DATE, dailyConfigFromSeed, getDailyConfig, getDailyDatePST, getDailyNumber } from './config.js';
import { resultRouter } from './results/api.js';
import { endTimedDailySession, getTimedDailySession, startTimedDailySession, submitTimedDailyWord } from './service.js';

export const dailyRouter = Router();

// Solver result cache keyed by date + board contents. Shared with the
// /session endpoints so we don't run the solver on every fetch — the
// salted hashes returned to clients are derived from the cached word
// list with a fresh per-request salt.
const solvedBoardCache = new Map<string, { totalFindable: number; words: string[]; }>();

function solveBoard(board: string[][], date: string): {
  totalFindable: number;
  salt: string;
  wordHashes: string[];
} {
  const key = `${date}:${board.flat().join('')}`;
  const minWordLength = getDailyConfig(date).minWordLength;
  let solved = solvedBoardCache.get(key);
  if (!solved) {
    const all = findAllWords(board, dictionary, minWordLength);
    solved = {
      totalFindable: all.length,
      words: all.map((w) => w.word),
    };
    solvedBoardCache.set(key, solved);
  }
  const salt = generateSalt();
  const wordHashes = solved.words.map((word) => hashWord(word, salt));
  return { totalFindable: solved.totalFindable, salt, wordHashes };
}

function getTodayPayload() {
  const date = getDailyDatePST();
  const number = getDailyNumber(date);
  const seed = getDailySeed(date);
  const config = getDailyConfig(date);
  const board = generateSeededBoard(config.boardSize, seed);
  return { date, number, seed, board, config };
}

// Public puzzle metadata. The salt + wordHashes payload powers the
// client's local hash check so word submissions get instant feedback
// without a server round-trip per attempt — the server still validates
// every accepted word via /session/:date/word, so the hashes are a UX
// aid, not the security boundary.
dailyRouter.get('/', (_req, res) => {
  const payload = getTodayPayload();
  const { salt, wordHashes } = solveBoard(payload.board, payload.date);
  cachePublic(res, 60);
  res.json({ ...payload, salt, wordHashes });
});

// Dev-only: preview the config + board for an arbitrary seed without
// spoiling future dailies. Accepts numeric or string seeds; strings are
// hashed to a 32-bit integer.
if (process.env.NODE_ENV !== 'production') {
  dailyRouter.get('/preview', (req, res) => {
    const raw = typeof req.query.seed === 'string' ? req.query.seed : '';
    if (!raw) return res.status(400).json({ error: 'Missing query param: seed' });
    const numeric = Number(raw);
    let seed: number;
    if (Number.isFinite(numeric)) {
      seed = Math.floor(numeric) >>> 0;
    } else {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < raw.length; i++) {
        h ^= raw.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      seed = h;
    }
    const config = dailyConfigFromSeed(seed);
    const board = generateSeededBoard(config.boardSize, seed);
    res.json({ seed, config, board });
  });
}

// Returns the player's session for the given date, or null if they
// haven't started yet. The salt + wordHashes are included while the
// session is still playable so the client can do instant local
// validation. Mirrors the zen daily session shape.
dailyRouter.get('/session/:date', requireAuth, endpoint(async (req, res) => {

  const session = await getTimedDailySession(getDb(), req.userId!, req.params.date);
  if (!session) {
    noStore(res);
    return res.json({ session: null });
  }
  const { totalFindable, salt, wordHashes } = solveBoard(session.board, req.params.date);
  noStore(res);
  res.json({
    session: { ...session, total_findable: totalFindable, salt, wordHashes, server_now: Date.now() },
  });

}));

// Idempotent start. Only today's date is acceptable — backfilling a
// session for a past date would let a player avoid the time limit.
dailyRouter.post('/session/:date/start', requireAuth, endpoint(async (req, res) => {

  const date = req.params.date;
  const today = getDailyDatePST();
  if (date !== today) {
    return res.status(400).json({ error: 'Can only start today\'s daily session' });
  }
  const config = getDailyConfig(date);
  const board = generateSeededBoard(config.boardSize, getDailySeed(date));
  const session = await startTimedDailySession(getDb(), req.userId!, date, board, config);
  const { totalFindable, salt, wordHashes } = solveBoard(session.board, date);
  noStore(res);
  res.json({ session: { ...session, total_findable: totalFindable, salt, wordHashes, server_now: Date.now() } });

}));

dailyRouter.post('/session/:date/word', requireAuth, endpoint(async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }

  const outcome = await submitTimedDailyWord(
    getDb(),
    req.userId!,
    req.params.date,
    path,
  );
  noStore(res);
  res.json(outcome);

}));

dailyRouter.post('/session/:date/end', requireAuth, endpoint(async (req, res) => {

  const session = await endTimedDailySession(getDb(), req.userId!, req.params.date);
  if (!session) {
    return res.status(404).json({ error: 'No session to end' });
  }
  noStore(res);
  res.json({ session });

}));

// Daily stats page payload — history, streak, averages, rankings in a
// single endpoint per the "endpoint-per-page" pattern; the client renders
// directly from this shape.
dailyRouter.get('/stats', requireAuth, endpoint(async (req, res) => {

  const db = getDb();
  const includeDefinitions = req.query.definitions !== '0';
  const stats = await getDailyStats(db, req.userId!, {
    launchDate: DAILY_LAUNCH_DATE,
    today: getDailyDatePST(),
    getPuzzleNumber: getDailyNumber,
    includeDefinitions,
  });
  cachePrivate(res, includeDefinitions ? 60 : 120);
  res.json(stats);

}));

dailyRouter.use(resultRouter);
