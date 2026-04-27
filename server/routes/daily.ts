import { Router } from 'express';
import { getDailySeed } from 'models/seedCode';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { dictionary } from '../services/dictionary.js';
import { scoreResult, scoreWords, getDailyStats } from '../services/DailyService.js';
import {
  DAILY_LAUNCH_DATE,
  dailyConfigFromSeed,
  getDailyConfig,
  getDailyDatePST,
  getDailyNumber,
} from '../services/dailyConfig.js';

export const dailyRouter = Router();

dailyRouter.get('/', (_req, res) => {
  const date = getDailyDatePST();
  const number = getDailyNumber(date);
  const seed = getDailySeed(date);
  const config = getDailyConfig(date);
  const board = generateSeededBoard(config.boardSize, seed);
  res.json({
    date,
    number,
    seed,
    board,
    config,
  });
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

dailyRouter.post('/results', requireAuth, async (req, res) => {
  const { date, found_words, board, config } = req.body;

  if (!date || !found_words || !board || !config) {
    return res.status(400).json({ error: 'Missing required fields: date, found_words, board, config' });
  }

  try {
    const { points, wordCount, longestWord } = scoreResult(found_words);
    const db = getDb();
    await db
      .insertInto('daily_results')
      .values({
        user_id: req.userId!,
        date,
        found_words: JSON.stringify(found_words),
        board: JSON.stringify(board),
        points,
        word_count: wordCount,
        longest_word: longestWord,
        board_size: config.boardSize,
        min_word_length: config.minWordLength,
        time_limit: config.timeLimit,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'date']).doUpdateSet({
          found_words: JSON.stringify(found_words),
          board: JSON.stringify(board),
          completed_at: new Date(),
          points,
          word_count: wordCount,
          longest_word: longestWord,
          board_size: config.boardSize,
          min_word_length: config.minWordLength,
          time_limit: config.timeLimit,
        }),
      )
      .execute();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to record daily result:', err);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

dailyRouter.get('/results/:date', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const result = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('user_id', '=', req.userId!)
      .where('date', '=', req.params.date)
      .executeTakeFirst();

    if (!result) {
      return res.json({ result: null });
    }

    // Compute missed words on demand. The found_words column is canonical;
    // we re-solve the board each time rather than storing the full solution
    // so old results automatically pick up any future dictionary or
    // scoring changes. The board + ~170k-word dictionary runs in a
    // couple of ms so the compute cost is negligible at this endpoint's
    // volume.
    const board: string[][] = typeof result.board === 'string'
      ? JSON.parse(result.board)
      : result.board;
    const foundWords: string[] = typeof result.found_words === 'string'
      ? JSON.parse(result.found_words)
      : result.found_words;
    const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
    const config = {
      boardSize: result.board_size,
      minWordLength: result.min_word_length,
      timeLimit: result.time_limit,
    };
    const missedWords = findAllWords(board, dictionary, config.minWordLength)
      .filter((w) => !foundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    res.json({
      result: {
        date: result.date,
        found_words: foundWords,
        board,
        missed_words: missedWords,
        completed_at: result.completed_at,
        config,
      },
    });
  } catch (err) {
    console.error('Failed to fetch daily result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// Side-by-side comparison of two users' daily submissions. Requires both
// players to have submitted for the given date. Returns already-scored
// payloads plus displayName lookups so the client can render the compare
// page without additional fan-out requests.
dailyRouter.get('/compare/:date', requireAuth, async (req, res) => {
  const { date } = req.params;
  const otherUserId = typeof req.query.other === 'string' ? req.query.other : '';
  const meUserId = req.userId!;

  if (!otherUserId) {
    return res.status(400).json({ error: 'Missing query param: other' });
  }
  if (otherUserId === meUserId) {
    return res.status(400).json({ error: 'Cannot compare with yourself' });
  }

  try {
    const db = getDb();
    const rows = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('date', '=', date)
      .where('user_id', 'in', [meUserId, otherUserId])
      .execute();

    const mine = rows.find((r) => r.user_id === meUserId);
    const theirs = rows.find((r) => r.user_id === otherUserId);

    if (!mine) {
      return res.status(409).json({ error: 'You have not played this daily yet' });
    }
    if (!theirs) {
      return res.status(404).json({ error: 'Opponent has not played this daily' });
    }

    const admin = getSupabaseAdmin();
    const [meMeta, themMeta] = await Promise.all(
      [meUserId, otherUserId].map((uid) =>
        admin.auth.admin
          .getUserById(uid)
          .then((r) => r.data.user?.user_metadata?.display_name || 'Anonymous')
          .catch(() => 'Anonymous'),
      ),
    );

    const parse = (r: typeof rows[number]) => {
      const board: string[][] = typeof r.board === 'string' ? JSON.parse(r.board) : r.board;
      const words: string[] = typeof r.found_words === 'string'
        ? JSON.parse(r.found_words)
        : r.found_words;
      return { board, words };
    };

    const me = parse(mine);
    const them = parse(theirs);

    const board = me.board;

    const mePayload = {
      userId: meUserId,
      displayName: meMeta,
      points: scoreWords(me.words),
      wordCount: me.words.length,
      foundWords: me.words.map((word) => ({ word, score: scoreWord(word) })),
    };
    const themPayload = {
      userId: otherUserId,
      displayName: themMeta,
      points: scoreWords(them.words),
      wordCount: them.words.length,
      foundWords: them.words.map((word) => ({ word, score: scoreWord(word) })),
    };

    const config = {
      boardSize: mine.board_size,
      minWordLength: mine.min_word_length,
      timeLimit: mine.time_limit,
    };

    res.json({
      date,
      puzzleNumber: getDailyNumber(date),
      board,
      me: mePayload,
      them: themPayload,
      config,
    });
  } catch (err) {
    console.error('Failed to fetch daily compare:', err);
    res.status(500).json({ error: 'Failed to fetch compare' });
  }
});

dailyRouter.get('/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const results = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('user_id', '=', req.userId!)
      .orderBy('date', 'desc')
      .execute();

    const today = getDailyDatePST();

    const entries = results.map((result) => {
      const words: string[] = typeof result.found_words === 'string'
        ? JSON.parse(result.found_words)
        : result.found_words;

      return {
        date: result.date,
        puzzleNumber: getDailyNumber(result.date),
        points: scoreWords(words),
        wordsFound: words.length,
        isToday: result.date === today,
      };
    });

    res.json({ entries });
  } catch (err) {
    console.error('Failed to fetch daily history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Daily stats page payload — history, streak, averages, rankings in a
// single endpoint per the "endpoint-per-page" pattern; the client renders
// directly from this shape.
dailyRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const stats = await getDailyStats(db, req.userId!, {
      launchDate: DAILY_LAUNCH_DATE,
      today: getDailyDatePST(),
      getPuzzleNumber: getDailyNumber,
    });
    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch daily stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
