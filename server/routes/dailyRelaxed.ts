import { Router } from 'express';
import { getDailyRelaxedSeed } from 'models/seedCode';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { dictionary } from '../services/dictionary.js';
import { scoreWords } from '../services/DailyService.js';
import {
  endSession,
  getSession,
  startSession,
  submitWord,
} from '../services/DailyRelaxedService.js';
import {
  DAILY_RELAXED_BOARD_SIZE,
  DAILY_RELAXED_MIN_WORD_LENGTH,
  getDailyRelaxedNumber,
} from '../services/dailyRelaxedConfig.js';
import { getDailyDatePST } from '../services/dailyConfig.js';

export const dailyRelaxedRouter = Router();

dailyRelaxedRouter.get('/', (_req, res) => {
  const date = getDailyDatePST();
  const number = getDailyRelaxedNumber(date);
  const seed = getDailyRelaxedSeed(date);
  const board = generateSeededBoard(DAILY_RELAXED_BOARD_SIZE, seed);
  res.json({
    date,
    number,
    seed,
    board,
    config: {
      boardSize: DAILY_RELAXED_BOARD_SIZE,
      minWordLength: DAILY_RELAXED_MIN_WORD_LENGTH,
    },
  });
});

// Returns the player's session for today (or whatever date they ask for).
// Null when they haven't started yet — the client uses this to decide
// between "Play", "Resume", and "See result" on the landing card.
dailyRelaxedRouter.get('/session/:date', requireAuth, async (req, res) => {
  try {
    const session = await getSession(getDb(), req.userId!, req.params.date);
    res.json({ session });
  } catch (err) {
    console.error('Failed to fetch relaxed session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Idempotent start. The board is the server's seeded board; the client
// receives it back and renders from it so resumes are deterministic.
dailyRelaxedRouter.post('/session/:date/start', requireAuth, async (req, res) => {
  try {
    const date = req.params.date;
    const today = getDailyDatePST();
    if (date !== today) {
      return res.status(400).json({ error: 'Can only start today\'s relaxed session' });
    }
    const board = generateSeededBoard(DAILY_RELAXED_BOARD_SIZE, getDailyRelaxedSeed(date));
    const session = await startSession(getDb(), req.userId!, date, board);
    res.json({ session });
  } catch (err) {
    console.error('Failed to start relaxed session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

dailyRelaxedRouter.post('/session/:date/word', requireAuth, async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }
  try {
    const outcome = await submitWord(getDb(), req.userId!, req.params.date, path);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit relaxed word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyRelaxedRouter.post('/session/:date/end', requireAuth, async (req, res) => {
  try {
    const session = await endSession(getDb(), req.userId!, req.params.date);
    if (!session) {
      return res.status(404).json({ error: 'No session to end' });
    }
    res.json({ session });
  } catch (err) {
    console.error('Failed to end relaxed session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Result for a finalized session — mirrors GET /api/daily/results/:date so
// the existing results page renders relaxed dailies with minimal changes.
dailyRelaxedRouter.get('/results/:date', requireAuth, async (req, res) => {
  try {
    const session = await getSession(getDb(), req.userId!, req.params.date);
    if (!session || !session.ended_at) {
      return res.json({ result: null });
    }
    const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
    const missedWords = findAllWords(session.board, dictionary, DAILY_RELAXED_MIN_WORD_LENGTH)
      .filter((w) => !foundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    res.json({
      result: {
        date: session.date,
        found_words: session.found_words,
        board: session.board,
        missed_words: missedWords,
        ended_at: session.ended_at,
        ended_by_player: session.ended_by_player,
      },
    });
  } catch (err) {
    console.error('Failed to fetch relaxed result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// Leaderboard for a relaxed daily date. Only finalized sessions count;
// in-progress sessions are filtered out so partial scores don't appear in
// rankings (and to give the player a reason to actually end the puzzle).
dailyRelaxedRouter.get('/leaderboard/:date', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .selectFrom('daily_relaxed_results')
      .selectAll()
      .where('date', '=', req.params.date)
      .where('ended_at', 'is not', null)
      .execute();

    const admin = getSupabaseAdmin();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const words = typeof row.found_words === 'string'
          ? (JSON.parse(row.found_words) as string[])
          : (row.found_words as string[]);
        const points = scoreWords(words);
        const wordCount = words.length;
        const displayName = await admin.auth.admin
          .getUserById(row.user_id)
          .then((r) => r.data.user?.user_metadata?.display_name || 'Anonymous')
          .catch(() => 'Anonymous');
        return {
          userId: row.user_id,
          displayName,
          points,
          wordCount,
          longestWord: row.longest_word,
        };
      }),
    );

    const byPoints = [...enriched].sort((a, b) => b.points - a.points || b.wordCount - a.wordCount);
    const byWords = [...enriched].sort((a, b) => b.wordCount - a.wordCount || b.points - a.points);

    const requestingUserId = req.userId;
    let currentPlayer: {
      points: number;
      wordsFound: number;
      longestWord: string;
      rank: number;
      totalPlayers: number;
    } | null = null;
    if (requestingUserId) {
      const idx = byPoints.findIndex((e) => e.userId === requestingUserId);
      if (idx >= 0) {
        const me = byPoints[idx];
        currentPlayer = {
          points: me.points,
          wordsFound: me.wordCount,
          longestWord: me.longestWord,
          rank: idx + 1,
          totalPlayers: byPoints.length,
        };
      }
    }

    const totalPoints = enriched.reduce((sum, e) => sum + e.points, 0);
    res.json({
      puzzleNumber: getDailyRelaxedNumber(req.params.date),
      totalPlayers: enriched.length,
      avgScore: enriched.length > 0 ? Math.round(totalPoints / enriched.length) : 0,
      rankings: {
        points: byPoints.map((e, i) => ({ ...e, rank: i + 1 })),
        words: byWords.map((e, i) => ({ ...e, rank: i + 1 })),
      },
      currentPlayer,
    });
  } catch (err) {
    console.error('Failed to fetch relaxed leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
