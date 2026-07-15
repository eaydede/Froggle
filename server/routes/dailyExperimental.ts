import { Router } from 'express';
import type { Position } from 'models';
import { generateSalt, hashWord } from 'models';
import {
  EXPERIMENTAL_MODES,
  goldenCell,
  type ExperimentalModeKey,
  type VoteSentiment,
} from 'models/experimental';
import { findAllWords } from 'engine/solver.js';
import { findAllGoldenWords } from 'engine/goldenSolver.js';
import { scoreWord } from 'engine/scoring.js';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { noStore } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import { getDailyDatePST } from '../services/dailyConfig.js';
import {
  getExperimentalNumber,
  prepareExperimentalBoard,
} from '../services/experimentalConfig.js';
import {
  castExperimentalVote,
  endExperimentalSession,
  getExperimentalRoster,
  getExperimentalSession,
  getExperimentalStatus,
  getExperimentalVote,
  getExperimentalVoteTallies,
  startExperimentalSession,
  submitExperimentalWord,
} from '../services/DailyExperimentalService.js';

export const dailyExperimentalRouter = Router();

function isModeKey(value: string): value is ExperimentalModeKey {
  return Object.prototype.hasOwnProperty.call(EXPERIMENTAL_MODES, value);
}

// Solve cache keyed by mode + date + board contents. Rebuilding the golden
// solve (26 tiny findAllWords passes) per request is wasteful — the puzzle for
// a given date is deterministic, so cache the full solver output (word + path)
// once and derive everything downstream (hashes, missed-word lists) from it.
interface CachedSolve {
  words: { word: string; path: Position[] }[];
  goldenWords: { word: string; path: Position[] }[];
}
const boardSolveCache = new Map<string, CachedSolve>();

function solveKey(
  modeKey: ExperimentalModeKey,
  date: string,
  board: string[][],
  minWordLength: number,
): string {
  return `${modeKey}:${date}:${board.flat().join('')}:${minWordLength}`;
}

function cachedSolve(
  modeKey: ExperimentalModeKey,
  date: string,
  board: string[][],
  minWordLength: number,
): CachedSolve {
  const key = solveKey(modeKey, date, board, minWordLength);
  const hit = boardSolveCache.get(key);
  if (hit) return hit;
  // Normal solve: words on the board as-is. On Golden Ticket boards the center
  // holds the raw marker character, which no real word contains, so the normal
  // solve naturally excludes paths through the center.
  const words = findAllWords(board, dictionary, minWordLength).map((w) => ({
    word: w.word,
    path: w.path,
  }));
  const goldenWords =
    modeKey === 'golden-ticket'
      ? findAllGoldenWords(board, dictionary, minWordLength, goldenCell(board.length)).map(
          (w) => ({ word: w.word, path: w.path }),
        )
      : [];
  const solved: CachedSolve = { words, goldenWords };
  boardSolveCache.set(key, solved);
  return solved;
}

// Salt + hashed word list for the client's instant local validation, exactly
// like the timed daily. `goldenHashes` is a second hash set covering every
// word findable when the center cell is a wildcard, present only for
// Golden Ticket. Both sets share a single salt so the client validator can
// membership-check with the same `hashWord` call.
function solveBoard(
  modeKey: ExperimentalModeKey,
  date: string,
  board: string[][],
  minWordLength: number,
): {
  salt: string;
  wordHashes: string[];
  goldenHashes: string[];
} {
  const solved = cachedSolve(modeKey, date, board, minWordLength);
  const salt = generateSalt();
  return {
    salt,
    wordHashes: solved.words.map((w) => hashWord(w.word, salt)),
    goldenHashes: solved.goldenWords.map((w) => hashWord(w.word, salt)),
  };
}

// Hub payload: today's date + puzzle number + each mode's completion state.
dailyExperimentalRouter.get('/status', requireAuth, async (req, res) => {
  try {
    const date = getDailyDatePST();
    const modes = await getExperimentalStatus(getDb(), req.userId!, date);
    noStore(res);
    res.json({ date, number: getExperimentalNumber(date), modes });
  } catch (err) {
    console.error('Failed to fetch experimental status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Today's board + config for a mode, for the overview + play screens.
dailyExperimentalRouter.get('/:mode', requireAuth, (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  const date = getDailyDatePST();
  const prepared = prepareExperimentalBoard(mode, date);
  const { salt, wordHashes, goldenHashes } = solveBoard(
    mode,
    date,
    prepared.board,
    prepared.minWordLength,
  );
  noStore(res);
  res.json({
    mode,
    date,
    number: getExperimentalNumber(date),
    board: prepared.board,
    config: {
      boardSize: prepared.boardSize,
      minWordLength: prepared.minWordLength,
      timeLimit: prepared.timeLimit,
    },
    salt,
    wordHashes,
    goldenHashes,
  });
});

// Resume: the player's session for the date, or null.
dailyExperimentalRouter.get('/:mode/session/:date', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  try {
    const session = await getExperimentalSession(getDb(), req.userId!, req.params.date, mode);
    if (!session) {
      noStore(res);
      return res.json({ session: null });
    }
    const { salt, wordHashes, goldenHashes } = solveBoard(
      mode,
      req.params.date,
      session.board,
      session.min_word_length,
    );
    noStore(res);
    res.json({ session: { ...session, salt, wordHashes, goldenHashes } });
  } catch (err) {
    console.error('Failed to fetch experimental session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

dailyExperimentalRouter.post('/:mode/session/:date/start', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  try {
    const date = req.params.date;
    if (date !== getDailyDatePST()) {
      return res.status(400).json({ error: 'Can only start today\'s experimental session' });
    }
    const session = await startExperimentalSession(getDb(), req.userId!, date, mode);
    const { salt, wordHashes, goldenHashes } = solveBoard(
      mode,
      date,
      session.board,
      session.min_word_length,
    );
    noStore(res);
    res.json({ session: { ...session, salt, wordHashes, goldenHashes } });
  } catch (err) {
    console.error('Failed to start experimental session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

dailyExperimentalRouter.post('/:mode/session/:date/word', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  const path = req.body?.path;
  if (!Array.isArray(path)) return res.status(400).json({ error: 'Missing path' });
  try {
    const outcome = await submitExperimentalWord(
      getDb(),
      req.userId!,
      req.params.date,
      mode,
      path,
    );
    noStore(res);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit experimental word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyExperimentalRouter.post('/:mode/session/:date/end', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  try {
    const session = await endExperimentalSession(getDb(), req.userId!, req.params.date, mode);
    if (!session) return res.status(404).json({ error: 'No session to end' });
    noStore(res);
    res.json({ session });
  } catch (err) {
    console.error('Failed to end experimental session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Result payload for the results screen: the finalized session, the ranked
// roster, missed words, and the player's own vote (tallies are never returned).
// Golden Ticket returns an empty missed_words list for v1 — the full golden-
// aware solution space is large and the results screen is pared down.
dailyExperimentalRouter.get('/:mode/results/:date', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  try {
    const db = getDb();
    const date = req.params.date;
    const session = await getExperimentalSession(db, req.userId!, date, mode);
    if (!session || !session.ended_at) {
      noStore(res);
      return res.json({ result: null });
    }

    // Missed words. Every mode surfaces the full solution set on the results
    // screen. Golden Ticket unions two solvers so both plain and wildcard
    // words appear:
    //   • Normal solve on the raw board — center-avoiding by construction
    //     (no dictionary word contains the wildcard marker).
    //   • Golden solve — words reachable when the center is a wildcard.
    // Both come out of `cachedSolve` (same cache the /start payload uses to
    // hash words), so this endpoint doesn't repeat the ~26-pass wildcard
    // solve on every visit. Dedupe by word, preferring the plain path.
    const solved = cachedSolve(mode, date, session.board, session.min_word_length);
    const foundSet = new Set(session.found_words.map((w) => w.toUpperCase()));
    const missedByWord = new Map<
      string,
      { word: string; path: Position[]; score: number }
    >();
    for (const w of solved.words) {
      missedByWord.set(w.word, { word: w.word, path: w.path, score: scoreWord(w.word) });
    }
    for (const w of solved.goldenWords) {
      if (missedByWord.has(w.word)) continue;
      missedByWord.set(w.word, { word: w.word, path: w.path, score: scoreWord(w.word) });
    }
    const missedWords = Array.from(missedByWord.values())
      .filter((w) => !foundSet.has(w.word))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    // Vote tallies are only surfaced once the player has voted themselves, so
    // early voters can't peek at the aggregate before committing.
    const [roster, vote] = await Promise.all([
      getExperimentalRoster(db, date, mode, req.userId!),
      getExperimentalVote(db, req.userId!, date, mode),
    ]);
    const voteTallies = vote ? await getExperimentalVoteTallies(db, mode) : null;

    // Response carries the player's vote — cache it and a fresh vote goes
    // stale until the browser cache expires. Compute is cheap enough
    // (session + a small missed-word solve) that no-store is the right call.
    noStore(res);
    res.json({
      result: {
        mode,
        date,
        number: getExperimentalNumber(date),
        board: session.board,
        state: session.state,
        found_words: session.found_words,
        word_times: session.word_times,
        missed_words: missedWords,
        points: session.points,
        word_count: session.word_count,
        config: {
          boardSize: session.board_size,
          minWordLength: session.min_word_length,
          timeLimit: session.time_limit,
        },
        roster,
        vote,
        voteTallies,
      },
    });
  } catch (err) {
    console.error('Failed to fetch experimental result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

dailyExperimentalRouter.post('/:mode/vote/:date', requireAuth, async (req, res) => {
  const mode = req.params.mode;
  if (!isModeKey(mode)) return res.status(404).json({ error: 'Unknown mode' });
  const sentiment = req.body?.sentiment as VoteSentiment | undefined;
  if (sentiment !== 'up' && sentiment !== 'meh' && sentiment !== 'down') {
    return res.status(400).json({ error: 'sentiment must be "up", "meh", or "down"' });
  }
  try {
    const db = getDb();
    await castExperimentalVote(db, req.userId!, req.params.date, mode, sentiment);
    // Return the fresh tallies so the client's tally bar can update the moment
    // the user votes — no second round-trip needed.
    const voteTallies = await getExperimentalVoteTallies(db, mode);
    noStore(res);
    res.json({ sentiment, voteTallies });
  } catch (err) {
    console.error('Failed to record experimental vote:', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});
