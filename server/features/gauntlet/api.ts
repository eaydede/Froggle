import { findAllWords } from 'engine/solver.js';
import { Router } from 'express';
import { generateSalt, hashWord } from 'models';
import {
  GAUNTLET_ROUND_COUNT
} from 'models/gauntlet';
import { dictionary } from '../../gameplay/dictionary.js';
import { requireAuth } from '../../platform/auth.js';
import { getDb } from '../../platform/database/index.js';
import { endpoint } from '../../platform/errors.js';
import { cachePrivate, noStore } from '../../platform/httpCache.js';
import { getDailyDatePST } from '../timed-daily/config.js';
import { DAILY_GAUNTLET_LAUNCH_DATE, getDailyGauntletNumber, prepareAllGauntletRounds } from './config.js';
import { resultRouter } from './results/api.js';
import { endGauntletRound, getDailyGauntletStats, getGauntletRoundSession, getGauntletStatus, startGauntletRound, submitGauntletWord } from './service.js';

export const dailyGauntletRouter = Router();

// Cache solved boards per (date, round) so the dictionary solver runs
// at most once per round per day. Salted hashes are re-generated per
// request, but the underlying word list comes from this cache.
const solvedRoundCache = new Map<string, { totalFindable: number; words: string[]; }>();

function solveRoundBoard(
  board: string[][],
  date: string,
  roundIndex: number,
  minWordLength: number,
): { totalFindable: number; salt: string; wordHashes: string[]; } {
  const key = `${date}:${roundIndex}:${board.flat().join('')}`;
  let solved = solvedRoundCache.get(key);
  if (!solved) {
    const all = findAllWords(board, dictionary, minWordLength);
    solved = { totalFindable: all.length, words: all.map((w) => w.word) };
    solvedRoundCache.set(key, solved);
  }
  const salt = generateSalt();
  const wordHashes = solved.words.map((word) => hashWord(word, salt));
  return { totalFindable: solved.totalFindable, salt, wordHashes };
}

function parseRoundIndex(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n >= GAUNTLET_ROUND_COUNT) return null;
  return n;
}

// ─── Today's status (hub payload) ────────────────────────────────────────

dailyGauntletRouter.get('/', requireAuth, endpoint(async (req, res) => {

  const date = getDailyDatePST();
  const status = await getGauntletStatus(getDb(), req.userId!, date);
  noStore(res);
  res.json({
    date,
    puzzleNumber: getDailyGauntletNumber(date),
    ...status,
  });

}));

// Per-day gauntlet history for the standings date picker. Single literal
// segment, so it must be registered before the `/:date/...` routes below.
dailyGauntletRouter.get('/stats', requireAuth, endpoint(async (req, res) => {

  const stats = await getDailyGauntletStats(getDb(), req.userId!, {
    launchDate: DAILY_GAUNTLET_LAUNCH_DATE,
    today: getDailyDatePST(),
  });
  // The window always includes today, whose state is still mutable, so the
  // whole payload must skip the cache — otherwise the picker can keep
  // showing today as not-completed for the TTL after the player finishes.
  noStore(res);
  res.json(stats);

}));

// Status (hub payload) for an arbitrary date — powers historic standings.
// Same shape as `/` (today) but lets the results page render past gauntlets.
dailyGauntletRouter.get('/:date/status', requireAuth, endpoint(async (req, res) => {

  const status = await getGauntletStatus(getDb(), req.userId!, req.params.date);
  // Today's state is still mutable (the player may finish more rounds
  // mid-session), so it must not be cached — otherwise a `partial` snapshot
  // fetched before finishing can mask the completed standings until the TTL
  // expires. Past dates are immutable (starts are gated to today).
  if (req.params.date === getDailyDatePST()) {
    noStore(res);
  } else {
    cachePrivate(res, 60);
  }
  res.json({
    date: req.params.date,
    puzzleNumber: getDailyGauntletNumber(req.params.date),
    ...status,
  });

}));

// Returns just the round configs (no user state) for /preview-style use.
// Useful for confirm-page rendering before /start has been called.
dailyGauntletRouter.get('/:date/preview', requireAuth, (req, res) => {
  try {
    const rounds = prepareAllGauntletRounds(req.params.date);
    res.json({
      date: req.params.date,
      puzzleNumber: getDailyGauntletNumber(req.params.date),
      rounds: rounds.map((r) => ({ config: r.config })),
    });
  } catch (err) {
    console.error('Failed to preview gauntlet:', err);
    res.status(500).json({ error: 'Failed to preview gauntlet' });
  }
});

// ─── Per-round session lifecycle ─────────────────────────────────────────

dailyGauntletRouter.get('/:date/round/:round', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const session = await getGauntletRoundSession(
    getDb(),
    req.userId!,
    req.params.date,
    roundIndex,
  );
  if (!session) {
    noStore(res);
    return res.json({ session: null });
  }
  const { totalFindable, salt, wordHashes } = solveRoundBoard(
    session.board,
    req.params.date,
    roundIndex,
    session.config.minWordLength,
  );
  noStore(res);
  res.json({
    session: {
      ...session,
      total_findable: totalFindable,
      salt,
      wordHashes,
      server_now: Date.now(),
    },
  });

}));

dailyGauntletRouter.post('/:date/round/:round/start', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const date = req.params.date;
  const today = getDailyDatePST();
  if (date !== today) {
    return res.status(400).json({ error: 'Can only start today\'s gauntlet round' });
  }

  const result = await startGauntletRound(getDb(), req.userId!, date, roundIndex);
  if ('error' in result) {
    if (result.error === 'locked') return res.status(409).json({ error: 'previous_round_incomplete' });
    return res.status(400).json({ error: 'invalid_round' });
  }
  const { totalFindable, salt, wordHashes } = solveRoundBoard(
    result.board,
    date,
    roundIndex,
    result.config.minWordLength,
  );
  noStore(res);
  res.json({
    session: { ...result, total_findable: totalFindable, salt, wordHashes, server_now: Date.now() },
  });

}));

dailyGauntletRouter.post('/:date/round/:round/word', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }

  const outcome = await submitGauntletWord(
    getDb(),
    req.userId!,
    req.params.date,
    roundIndex,
    path,
  );
  noStore(res);
  res.json(outcome);

}));

dailyGauntletRouter.post('/:date/round/:round/end', requireAuth, endpoint(async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const session = await endGauntletRound(
    getDb(),
    req.userId!,
    req.params.date,
    roundIndex,
  );
  if (!session) {
    return res.status(404).json({ error: 'No session to end' });
  }
  noStore(res);
  res.json({ session });

}));

dailyGauntletRouter.use(resultRouter);
