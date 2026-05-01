import { Router } from 'express';
import { getDailyZenSeed } from 'models/seedCode';
import { generateSalt, hashWord } from 'models';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { dictionary } from '../services/dictionary.js';
import {
  endSession,
  getDailyZenStats,
  getSession,
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

export const dailyZenRouter = Router();

dailyZenRouter.get('/', (_req, res) => {
  const date = getDailyDatePST();
  const number = getDailyZenNumber(date);
  const seed = getDailyZenSeed(date);
  const config = getDailyZenConfig(date);
  const board = generateSeededBoard(config.boardSize, seed);
  const { salt, wordHashes } = solveBoard(board, date);
  res.json({
    date,
    number,
    seed,
    board,
    config,
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
  const minWordLength = getDailyZenConfig(date).minWordLength;
  const all = findAllWords(board, dictionary, minWordLength);
  const salt = generateSalt();
  const wordHashes = all.map((w) => hashWord(w.word, salt));
  return { totalFindable: all.length, salt, wordHashes };
}

// Returns the player's session for today (or whatever date they ask for).
// Null when they haven't started yet — the client uses this to decide
// between "Play", "Resume", and "See result" on the landing card.
dailyZenRouter.get('/session/:date', requireAuth, async (req, res) => {
  try {
    const session = await getSession(getDb(), req.userId!, req.params.date);
    if (!session) return res.json({ session: null });
    const { totalFindable, salt, wordHashes } = solveBoard(session.board, req.params.date);
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

    res.json({
      result: {
        date: session.date,
        found_words: foundWords,
        board: session.board,
        missed_words: missedWords,
        ended_at: session.ended_at,
        ended_by_player: session.ended_by_player,
        is_competitive: session.is_competitive,
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
    });
    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch zen stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Leaderboard for a zen daily date. Casual players and in-progress
// competitive players are excluded from the ranked lists; in-progress
// players (both modes) come back as a score-less presence list. See
// `getZenLeaderboard` for the full shape.
dailyZenRouter.get('/leaderboard/:date', async (req, res) => {
  try {
    const result = await getZenLeaderboard(getDb(), req.params.date, req.userId);
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch zen leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
