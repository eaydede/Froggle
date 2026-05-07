import { Router } from 'express';
import { getDailyZenSeed } from 'models/seedCode';
import { generateSalt, hashWord } from 'models';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { cachePrivate, cachePublic, noStore } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import {
  endSession,
  getDailyZenStats,
  getSession,
  getZenCompare,
  getZenLeaderboard,
  startSession,
  submitWord,
} from '../services/DailyZenService.js';
import {
  DAILY_ZEN_LAUNCH_DATE,
  getDailyZenConfig,
  getDailyZenNumber,
} from '../services/dailyZenConfig.js';
import { getDailyDatePST } from '../services/dailyConfig.js';
import { getZenDailyWordPercents } from '../services/dailyWordStats.js';

export const dailyZenRouter = Router();

const solvedBoardCache = new Map<string, { totalFindable: number; words: string[] }>();

function getZenDailyPayload() {
  const date = getDailyDatePST();
  const number = getDailyZenNumber(date);
  const seed = getDailyZenSeed(date);
  const config = getDailyZenConfig(date);
  const board = generateSeededBoard(config.boardSize, seed);
  return { date, number, seed, board, config };
}

dailyZenRouter.get('/meta', (_req, res) => {
  cachePublic(res, 60);
  res.json(getZenDailyPayload());
});

dailyZenRouter.get('/', (_req, res) => {
  const payload = getZenDailyPayload();
  const { date, board } = payload;
  const { salt, wordHashes } = solveBoard(board, date);
  cachePublic(res, 60);
  res.json({
    ...payload,
    salt,
    wordHashes,
  });
});

// Solves the board once and returns both the total-findable count and the
// salted word hashes the client uses for instant local validation. Both
// pieces of data come from the same solver pass so we don't run it twice.
function solveBoard(board: string[][], date: string): {
  totalFindable: number;
  salt: string;
  wordHashes: string[];
} {
  const key = `${date}:${board.flat().join('')}`;
  const minWordLength = getDailyZenConfig(date).minWordLength;
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

// Returns the player's session for today (or whatever date they ask for).
// Null when they haven't started yet — the client uses this to decide
// between "Play", "Resume", and "See result" on the landing card.
dailyZenRouter.get('/session/:date', requireAuth, async (req, res) => {
  try {
    const session = await getSession(getDb(), req.userId!, req.params.date);
    if (!session) {
      noStore(res);
      return res.json({ session: null });
    }
    const { totalFindable, salt, wordHashes } = solveBoard(session.board, req.params.date);
    noStore(res);
    res.json({
      session: { ...session, total_findable: totalFindable, salt, wordHashes },
    });
  } catch (err) {
    console.error('Failed to fetch zen session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Idempotent start. The board is the server's seeded board; the client
// receives it back and renders from it so resumes are deterministic.
dailyZenRouter.post('/session/:date/start', requireAuth, async (req, res) => {
  try {
    const date = req.params.date;
    const today = getDailyDatePST();
    if (date !== today) {
      return res.status(400).json({ error: 'Can only start today\'s zen session' });
    }
    const board = generateSeededBoard(getDailyZenConfig(date).boardSize, getDailyZenSeed(date));
    // Default to competitive when omitted so existing clients (and any
    // missing-body case) preserve the pre-feature behavior.
    const isCompetitive = req.body?.isCompetitive !== false;
    const session = await startSession(getDb(), req.userId!, date, board, isCompetitive);
    const { totalFindable, salt, wordHashes } = solveBoard(session.board, date);
    noStore(res);
    res.json({ session: { ...session, total_findable: totalFindable, salt, wordHashes } });
  } catch (err) {
    console.error('Failed to start zen session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

dailyZenRouter.post('/session/:date/word', requireAuth, async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }
  try {
    const outcome = await submitWord(getDb(), req.userId!, req.params.date, path);
    noStore(res);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit zen word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyZenRouter.post('/session/:date/end', requireAuth, async (req, res) => {
  try {
    const session = await endSession(getDb(), req.userId!, req.params.date);
    if (!session) {
      return res.status(404).json({ error: 'No session to end' });
    }
    noStore(res);
    res.json({ session });
  } catch (err) {
    console.error('Failed to end zen session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Result for a finalized session — mirrors GET /api/daily/results/:date so
// the existing results page renders zen dailies with minimal changes.
dailyZenRouter.get('/results/:date', requireAuth, async (req, res) => {
  try {
    const session = await getSession(getDb(), req.userId!, req.params.date);
    if (!session || !session.ended_at) {
      noStore(res);
      return res.json({ result: null });
    }
    const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
    const allWords = findAllWords(
      session.board,
      dictionary,
      getDailyZenConfig(req.params.date).minWordLength,
    );
    // The session row stores only word strings (not the path the player
    // drew), so we look the path up from the solver. A board position can
    // produce a given word along multiple paths; the solver returns one
    // canonical path per word, which is good enough for results-page
    // highlighting.
    const pathByWord = new Map(allWords.map((w) => [w.word, w.path]));
    const foundWords = session.found_words.map((w) => {
      const upper = w.toUpperCase();
      return {
        word: upper,
        path: pathByWord.get(upper) ?? [],
        score: scoreWord(upper),
      };
    });
    const missedWords = allWords
      .filter((w) => !foundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    const findPercents = await getZenDailyWordPercents(
      getDb(),
      session.date,
      getDailyDatePST(),
    );

    cachePrivate(res, 60);
    res.json({
      result: {
        date: session.date,
        found_words: foundWords,
        board: session.board,
        missed_words: missedWords,
        ended_at: session.ended_at,
        ended_by_player: session.ended_by_player,
        is_competitive: session.is_competitive,
        theoretical_max_score: session.theoretical_max_score,
        find_percents: findPercents,
      },
    });
  } catch (err) {
    console.error('Failed to fetch zen result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// Per-day zen history for the date picker on zen results / leaderboard pages.
dailyZenRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getDailyZenStats(getDb(), req.userId!, {
      launchDate: DAILY_ZEN_LAUNCH_DATE,
      today: getDailyDatePST(),
      includeDefinitions: req.query.definitions !== '0',
    });
    cachePrivate(res, req.query.definitions !== '0' ? 60 : 120);
    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch zen stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Side-by-side comparison of two finalized zen sessions. Mirrors the timed
// daily compare endpoint's status codes so the client can share its
// fetch/error machinery.
dailyZenRouter.get('/compare/:date', requireAuth, async (req, res) => {
  const otherUserId = typeof req.query.other === 'string' ? req.query.other : '';
  if (!otherUserId) {
    return res.status(400).json({ error: 'Missing query param: other' });
  }
  try {
    const result = await getZenCompare(getDb(), req.params.date, req.userId!, otherUserId);
    if (result.ok) {
      cachePrivate(res, 30);
      return res.json(result.data);
    }
    if (result.error === 'unplayed') return res.status(409).json({ error: 'You have not finished this zen daily yet' });
    if (result.error === 'opponent-missing') return res.status(404).json({ error: 'Opponent has not finished this zen daily' });
    return res.status(400).json({ error: 'Cannot compare with yourself' });
  } catch (err) {
    console.error('Failed to fetch zen compare:', err);
    res.status(500).json({ error: 'Failed to fetch compare' });
  }
});

// Leaderboard for a zen daily date. Casual players and in-progress
// competitive players are excluded from the ranked lists; in-progress
// players (both modes) come back as a score-less presence list. See
// `getZenLeaderboard` for the full shape.
dailyZenRouter.get('/leaderboard/:date', async (req, res) => {
  try {
    const result = await getZenLeaderboard(getDb(), req.params.date, req.userId);
    cachePrivate(res, 10);
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch zen leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
