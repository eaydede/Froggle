import { Router } from 'express';
import { getDailyZenSeed } from 'models/seedCode';
import { generateSalt, hashWord } from 'models';
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
  getDailyZenStats,
  getSession,
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
    const session = await startSession(getDb(), req.userId!, date, board);
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

// Leaderboard for a zen daily date. Includes both in-progress and finalized
// sessions so players can watch each other's standings shift through the day;
// the `inProgress` flag lets the client distinguish the two visually.
dailyZenRouter.get('/leaderboard/:date', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .selectFrom('daily_zen_results')
      .selectAll()
      .where('date', '=', req.params.date)
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
          inProgress: row.ended_at === null,
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
      puzzleNumber: getDailyZenNumber(req.params.date),
      totalPlayers: enriched.length,
      avgScore: enriched.length > 0 ? Math.round(totalPoints / enriched.length) : 0,
      rankings: {
        points: byPoints.map((e, i) => ({ ...e, rank: i + 1 })),
        words: byWords.map((e, i) => ({ ...e, rank: i + 1 })),
      },
      currentPlayer,
    });
  } catch (err) {
    console.error('Failed to fetch zen leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
