import { Router } from 'express';
import { getDailySeed } from 'models/seedCode';
import { generateSalt, hashWord } from 'models';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { cachePrivate, cachePublic, noStore } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import {
  endTimedDailySession,
  getDailyStats,
  getTimedDailySession,
  scoreWords,
  startTimedDailySession,
  submitTimedDailyWord,
} from '../services/DailyService.js';
import { getTimedDailyWordPercents } from '../services/dailyWordStats.js';
import { getDisplayNames } from '../services/displayNames.js';
import {
  DAILY_LAUNCH_DATE,
  dailyConfigFromSeed,
  getDailyConfig,
  getDailyDatePST,
  getDailyNumber,
} from '../services/dailyConfig.js';

export const dailyRouter = Router();

// Solver result cache keyed by date + board contents. Shared with the
// /session endpoints so we don't run the solver on every fetch — the
// salted hashes returned to clients are derived from the cached word
// list with a fresh per-request salt.
const solvedBoardCache = new Map<string, { totalFindable: number; words: string[] }>();

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
dailyRouter.get('/session/:date', requireAuth, async (req, res) => {
  try {
    const session = await getTimedDailySession(getDb(), req.userId!, req.params.date);
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
    console.error('Failed to fetch timed daily session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Idempotent start. Only today's date is acceptable — backfilling a
// session for a past date would let a player avoid the time limit.
dailyRouter.post('/session/:date/start', requireAuth, async (req, res) => {
  try {
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
    res.json({ session: { ...session, total_findable: totalFindable, salt, wordHashes } });
  } catch (err) {
    console.error('Failed to start timed daily session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

dailyRouter.post('/session/:date/word', requireAuth, async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }
  try {
    const outcome = await submitTimedDailyWord(
      getDb(),
      req.userId!,
      req.params.date,
      path,
    );
    noStore(res);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit timed daily word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyRouter.post('/session/:date/end', requireAuth, async (req, res) => {
  try {
    const session = await endTimedDailySession(getDb(), req.userId!, req.params.date);
    if (!session) {
      return res.status(404).json({ error: 'No session to end' });
    }
    noStore(res);
    res.json({ session });
  } catch (err) {
    console.error('Failed to end timed daily session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

dailyRouter.get('/results/:date', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    // Auto-finalize on read so a player whose timer ran out without /end
    // being called still sees their result page.
    const session = await getTimedDailySession(db, req.userId!, req.params.date);
    if (!session || !session.ended_at) {
      noStore(res);
      return res.json({ result: null });
    }
    const result = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('user_id', '=', req.userId!)
      .where('date', '=', req.params.date)
      .executeTakeFirst();

    if (!result) {
      noStore(res);
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

    const findPercents = await getTimedDailyWordPercents(
      db,
      result.date,
      getDailyDatePST(),
    );

    cachePrivate(res, 60);
    res.json({
      result: {
        date: result.date,
        found_words: foundWords,
        board,
        missed_words: missedWords,
        completed_at: result.completed_at,
        config,
        find_percents: findPercents,
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

    if (!mine || !mine.ended_at) {
      return res.status(409).json({ error: 'You have not played this daily yet' });
    }
    if (!theirs || !theirs.ended_at) {
      return res.status(404).json({ error: 'Opponent has not played this daily' });
    }

    const displayNames = await getDisplayNames([meUserId, otherUserId]);
    const meMeta = displayNames.get(meUserId) ?? 'Anonymous';
    const themMeta = displayNames.get(otherUserId) ?? 'Anonymous';

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

    cachePrivate(res, 30);
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
      .where('ended_at', 'is not', null)
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

    cachePrivate(res, 60);
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
    const includeDefinitions = req.query.definitions !== '0';
    const stats = await getDailyStats(db, req.userId!, {
      launchDate: DAILY_LAUNCH_DATE,
      today: getDailyDatePST(),
      getPuzzleNumber: getDailyNumber,
      includeDefinitions,
    });
    cachePrivate(res, includeDefinitions ? 60 : 120);
    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch daily stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
