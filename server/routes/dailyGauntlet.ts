import { Router } from 'express';
import { findAllWords } from 'engine/solver.js';
import { generateSalt, hashWord } from 'models';
import {
  GAUNTLET_ROUND_COUNT,
  type GauntletModifier,
} from 'models/gauntlet';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { cachePrivate, noStore } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import { getDailyDatePST } from '../services/dailyConfig.js';
import {
  getDailyGauntletNumber,
  prepareAllGauntletRounds,
  prepareGauntletRound,
} from '../services/dailyGauntletConfig.js';
import {
  endGauntletRound,
  getGauntletAggregate,
  getGauntletRoundRanks,
  getGauntletRoundSession,
  getGauntletStatus,
  scoreFoundWords,
  startGauntletRound,
  submitGauntletWord,
} from '../services/DailyGauntletService.js';
import { getDisplayNames } from '../services/displayNames.js';

export const dailyGauntletRouter = Router();

// Cache solved boards per (date, round) so the dictionary solver runs
// at most once per round per day. Salted hashes are re-generated per
// request, but the underlying word list comes from this cache.
const solvedRoundCache = new Map<string, { totalFindable: number; words: string[] }>();

function solveRoundBoard(
  board: string[][],
  date: string,
  roundIndex: number,
  minWordLength: number,
): { totalFindable: number; salt: string; wordHashes: string[] } {
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

dailyGauntletRouter.get('/', requireAuth, async (req, res) => {
  try {
    const date = getDailyDatePST();
    const status = await getGauntletStatus(getDb(), req.userId!, date);
    noStore(res);
    res.json({
      date,
      puzzleNumber: getDailyGauntletNumber(date),
      ...status,
    });
  } catch (err) {
    console.error('Failed to fetch gauntlet status:', err);
    res.status(500).json({ error: 'Failed to fetch gauntlet status' });
  }
});

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

dailyGauntletRouter.get('/:date/round/:round', requireAuth, async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  try {
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
      },
    });
  } catch (err) {
    console.error('Failed to fetch gauntlet round session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

dailyGauntletRouter.post('/:date/round/:round/start', requireAuth, async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const date = req.params.date;
  const today = getDailyDatePST();
  if (date !== today) {
    return res.status(400).json({ error: 'Can only start today\'s gauntlet round' });
  }
  try {
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
      session: { ...result, total_findable: totalFindable, salt, wordHashes },
    });
  } catch (err) {
    console.error('Failed to start gauntlet round:', err);
    res.status(500).json({ error: 'Failed to start round' });
  }
});

dailyGauntletRouter.post('/:date/round/:round/word', requireAuth, async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  const path = req.body?.path;
  if (!Array.isArray(path)) {
    return res.status(400).json({ error: 'Missing path' });
  }
  try {
    const outcome = await submitGauntletWord(
      getDb(),
      req.userId!,
      req.params.date,
      roundIndex,
      path,
    );
    noStore(res);
    res.json(outcome);
  } catch (err) {
    console.error('Failed to submit gauntlet word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

dailyGauntletRouter.post('/:date/round/:round/end', requireAuth, async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  try {
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
  } catch (err) {
    console.error('Failed to end gauntlet round:', err);
    res.status(500).json({ error: 'Failed to end round' });
  }
});

// ─── Per-round results (deep-dive page) ──────────────────────────────────

dailyGauntletRouter.get('/:date/round/:round/results', requireAuth, async (req, res) => {
  const roundIndex = parseRoundIndex(req.params.round);
  if (roundIndex === null) {
    return res.status(400).json({ error: 'Invalid round index' });
  }
  try {
    const db = getDb();
    const session = await getGauntletRoundSession(
      db,
      req.userId!,
      req.params.date,
      roundIndex,
    );
    if (!session || !session.endedAt) {
      noStore(res);
      return res.json({ result: null });
    }

    const foundSet = new Set(session.foundWords.map((w) => w.toUpperCase()));
    const missed = findAllWords(session.board, dictionary, session.config.minWordLength)
      .filter((w) => !foundSet.has(w.word));
    const scoredMissed = scoreFoundWords(
      missed.map((w) => w.word),
      session.modifier as GauntletModifier,
    );
    const missedWords = missed
      .map((w, i) => ({ word: w.word, path: w.path, score: scoredMissed[i].score }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    cachePrivate(res, 60);
    res.json({
      result: {
        date: session.date,
        roundIndex,
        roundKind: session.roundKind,
        modifier: session.modifier,
        config: session.config,
        board: session.board,
        found_words: session.foundWords,
        points: session.points,
        word_count: session.wordCount,
        longest_word: session.longestWord,
        missed_words: missedWords,
        completed_at: session.completedAt,
      },
    });
  } catch (err) {
    console.error('Failed to fetch gauntlet round results:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ─── Aggregate results + leaderboard ─────────────────────────────────────

dailyGauntletRouter.get('/:date/leaderboard', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const date = req.params.date;
    const [perRound, aggregate] = await Promise.all([
      getGauntletRoundRanks(db, date),
      getGauntletAggregate(db, date),
    ]);

    // Display names resolved in one pass against the union of users
    // appearing in either list. Cached helper so repeated calls within
    // the TTL hit memory.
    const userIds = new Set<string>();
    for (const r of perRound) userIds.add(r.user_id);
    for (const a of aggregate) userIds.add(a.userId);
    const names = await getDisplayNames(Array.from(userIds));

    cachePrivate(res, 30);
    res.json({
      date,
      puzzleNumber: getDailyGauntletNumber(date),
      currentUserId: req.userId,
      perRound: perRound.map((r) => ({
        userId: r.user_id,
        displayName: names.get(r.user_id) ?? 'Anonymous',
        roundIndex: r.round_index,
        points: r.points,
        wordCount: r.word_count,
        rank: r.rank,
      })),
      aggregate: aggregate.map((a) => ({
        userId: a.userId,
        displayName: names.get(a.userId) ?? 'Anonymous',
        roundRanks: a.roundRanks,
        rankSum: a.rankSum,
        aggregateRank: a.aggregateRank,
      })),
    });
  } catch (err) {
    console.error('Failed to fetch gauntlet leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Side-by-side compare for a single gauntlet round. Mirrors the timed
// daily /compare endpoint shape so the shared ResultsView's
// loadOpponent surface plugs in without bespoke handling. Both players
// must have finalized the round; the response carries each side's
// scored word list against the shared board + modifier.
dailyGauntletRouter.get(
  '/:date/round/:round/compare',
  requireAuth,
  async (req, res) => {
    const roundIndex = parseRoundIndex(req.params.round);
    if (roundIndex === null) {
      return res.status(400).json({ error: 'Invalid round index' });
    }
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
        .selectFrom('daily_gauntlet_results')
        .selectAll()
        .where('date', '=', date)
        .where('round_index', '=', roundIndex)
        .where('user_id', 'in', [meUserId, otherUserId])
        .execute();

      const mine = rows.find((r) => r.user_id === meUserId);
      const theirs = rows.find((r) => r.user_id === otherUserId);
      if (!mine || !mine.ended_at) {
        return res.status(409).json({ error: 'You have not played this round yet' });
      }
      if (!theirs || !theirs.ended_at) {
        return res.status(404).json({ error: 'Opponent has not played this round' });
      }

      const names = await getDisplayNames([meUserId, otherUserId]);
      const modifier = (typeof theirs.modifier === 'string'
        ? JSON.parse(theirs.modifier)
        : theirs.modifier) as GauntletModifier;
      const parseWords = (raw: unknown): string[] =>
        typeof raw === 'string' ? JSON.parse(raw) : (raw as string[]);
      const myWords = parseWords(mine.found_words);
      const theirWords = parseWords(theirs.found_words);
      const board = (typeof mine.board === 'string'
        ? JSON.parse(mine.board)
        : mine.board) as string[][];

      cachePrivate(res, 30);
      res.json({
        date,
        roundIndex,
        roundKind: theirs.round_kind,
        modifier,
        puzzleNumber: getDailyGauntletNumber(date),
        board,
        config: {
          boardSize: mine.board_size,
          minWordLength: mine.min_word_length,
          timeLimit: mine.time_limit,
        },
        me: {
          userId: meUserId,
          displayName: names.get(meUserId) ?? 'Anonymous',
          points: mine.points,
          wordCount: mine.word_count,
          foundWords: scoreFoundWords(myWords, modifier),
        },
        them: {
          userId: otherUserId,
          displayName: names.get(otherUserId) ?? 'Anonymous',
          points: theirs.points,
          wordCount: theirs.word_count,
          foundWords: scoreFoundWords(theirWords, modifier),
        },
      });
    } catch (err) {
      console.error('Failed to fetch gauntlet compare:', err);
      res.status(500).json({ error: 'Failed to fetch compare' });
    }
  },
);
