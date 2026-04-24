import { Router } from 'express';
import { getDailySeed } from 'models/seedCode';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { dictionary } from '../services/dictionary.js';
import { scoreResult, scoreWords, getDailyStats } from '../services/DailyService.js';
import {
  DAILY_BOARD_SIZE,
  DAILY_LAUNCH_DATE,
  DAILY_MIN_WORD_LENGTH,
  DAILY_TIME_LIMIT,
  getDailyDatePST,
  getDailyNumber,
} from '../services/dailyConfig.js';

export const dailyRouter = Router();

dailyRouter.get('/', (_req, res) => {
  const date = getDailyDatePST();
  const number = getDailyNumber(date);
  const seed = getDailySeed(date);
  const board = generateSeededBoard(DAILY_BOARD_SIZE, seed);
  res.json({
    date,
    number,
    seed,
    board,
    config: {
      boardSize: DAILY_BOARD_SIZE,
      timeLimit: DAILY_TIME_LIMIT,
      minWordLength: DAILY_MIN_WORD_LENGTH,
    },
  });
});

dailyRouter.post('/results', requireAuth, async (req, res) => {
  const { date, found_words, board } = req.body;

  if (!date || !found_words || !board) {
    return res.status(400).json({ error: 'Missing required fields: date, found_words, board' });
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
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'date']).doUpdateSet({
          found_words: JSON.stringify(found_words),
          board: JSON.stringify(board),
          completed_at: new Date(),
          points,
          word_count: wordCount,
          longest_word: longestWord,
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
    // scoring changes. The 5x5 board + ~170k-word dictionary runs in a
    // couple of ms so the compute cost is negligible at this endpoint's
    // volume.
    const board: string[][] = typeof result.board === 'string'
      ? JSON.parse(result.board)
      : result.board;
    const foundWords: string[] = typeof result.found_words === 'string'
      ? JSON.parse(result.found_words)
      : result.found_words;
    const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
    const missedWords = findAllWords(board, dictionary, DAILY_MIN_WORD_LENGTH)
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
      },
    });
  } catch (err) {
    console.error('Failed to fetch daily result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
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
