import { Router } from 'express';
import type { Position } from 'models';
import { generateSalt, hashWord } from 'models';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { noStore } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import { getDailyDatePST } from '../services/dailyConfig.js';
import {
  getTimeIsMoneyNumber,
  prepareTimeIsMoneyBoard,
} from '../services/timeIsMoneyConfig.js';
import {
  endTimeIsMoneySession,
  getTimeIsMoneyRoster,
  getTimeIsMoneySession,
  getTimeIsMoneyStatus,
  startTimeIsMoneySession,
  submitTimeIsMoneyWord,
} from '../services/DailyTimeIsMoneyService.js';

export const dailyTimeIsMoneyRouter = Router();

// Solve cache keyed by date + board contents + min length. The day's puzzle is
// deterministic, so the full solver output is computed once and everything
// downstream (word hashes, the missed-word list) derives from it.
//
// `minWordLength` is always the value persisted on the row, never the current
// config: retuning the mode must not change what an already-started or
// already-finished board solves to. It's part of the cache key for the same
// reason — one board can legitimately have two solutions across a retune, and
// keying on the board alone would serve one run's hashes to the other.
const boardSolveCache = new Map<string, { word: string; path: Position[] }[]>();

function cachedSolve(
  date: string,
  board: string[][],
  minWordLength: number,
): { word: string; path: Position[] }[] {
  const key = `${date}:${board.flat().join('')}:${minWordLength}`;
  const hit = boardSolveCache.get(key);
  if (hit) return hit;
  const solved = findAllWords(board, dictionary, minWordLength).map((w) => ({
    word: w.word,
    path: w.path,
  }));
  boardSolveCache.set(key, solved);
  return solved;
}

// Salt + hashed word list for the client's instant local validation, exactly
// like the timed daily. Hashes must cover exactly the words the server's submit
// path will accept, so this takes the session's own min length.
function solveBoard(
  date: string,
  board: string[][],
  minWordLength: number,
): { salt: string; wordHashes: string[] } {
  const salt = generateSalt();
  return {
    salt,
    wordHashes: cachedSolve(date, board, minWordLength).map((w) => hashWord(w.word, salt)),
  };
}

// Landing payload: today's date + puzzle number + the player's state.
dailyTimeIsMoneyRouter.get('/status', requireAuth, async (req, res) => {
  try {
    const date = getDailyDatePST();
    const status = await getTimeIsMoneyStatus(getDb(), req.userId!, date);
    noStore(res);
    res.json({ date, number: getTimeIsMoneyNumber(date), ...status });
  } catch (err) {
    console.error('Failed to fetch Time is Money status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Resume: the player's session for the date, or null.
dailyTimeIsMoneyRouter.get('/session/:date', requireAuth, async (req, res) => {
  try {
    const session = await getTimeIsMoneySession(getDb(), req.userId!, req.params.date);
    if (!session) {
      noStore(res);
      return res.json({ session: null });
    }
    noStore(res);
    res.json({
      session: {
        ...session,
        ...solveBoard(req.params.date, session.board, session.min_word_length),
        server_now: Date.now(),
      },
    });
  } catch (err) {
    console.error('Failed to fetch Time is Money session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

dailyTimeIsMoneyRouter.post('/session/:date/start', requireAuth, async (req, res) => {
  try {
    const date = req.params.date;
    if (date !== getDailyDatePST()) {
      return res.status(400).json({ error: "Can only start today's Time is Money session" });
    }
    const session = await startTimeIsMoneySession(getDb(), req.userId!, date);
    noStore(res);
    res.json({
      session: { ...session, ...solveBoard(date, session.board, session.min_word_length), server_now: Date.now() },
    });
  } catch (err) {
    console.error('Failed to start Time is Money session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

dailyTimeIsMoneyRouter.post('/session/:date/word', requireAuth, async (req, res) => {
  const path = req.body?.path;
  if (!Array.isArray(path)) return res.status(400).json({ error: 'Missing path' });
  try {
    const outcome = await submitTimeIsMoneyWord(getDb(), req.userId!, req.params.date, path);
    noStore(res);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit Time is Money word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyTimeIsMoneyRouter.post('/session/:date/end', requireAuth, async (req, res) => {
  try {
    const session = await endTimeIsMoneySession(getDb(), req.userId!, req.params.date);
    if (!session) return res.status(404).json({ error: 'No session to end' });
    noStore(res);
    res.json({ session });
  } catch (err) {
    console.error('Failed to end Time is Money session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Result payload for the results screen: the finalized session, the ranked
// roster, and the words left on the board.
dailyTimeIsMoneyRouter.get('/results/:date', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const date = req.params.date;
    const session = await getTimeIsMoneySession(db, req.userId!, date);
    if (!session || !session.ended_at) {
      noStore(res);
      return res.json({ result: null });
    }

    const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
    const missedWords = cachedSolve(date, session.board, session.min_word_length)
      .filter((w) => !foundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    const roster = await getTimeIsMoneyRoster(db, date, req.userId!);

    noStore(res);
    res.json({
      result: {
        date,
        number: getTimeIsMoneyNumber(date),
        board: session.board,
        found_words: session.found_words,
        missed_words: missedWords,
        points: session.points,
        word_count: session.word_count,
        config: {
          boardSize: session.board_size,
          minWordLength: session.min_word_length,
          timeLimit: session.time_limit,
        },
        roster,
      },
    });
  } catch (err) {
    console.error('Failed to fetch Time is Money result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});
