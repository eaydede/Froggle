import { Router } from 'express';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { getDailySeed } from 'models/seedCode';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import { cachePrivate } from '../httpCache.js';
import { dictionary } from '../services/dictionary.js';
import { getDisplayNames } from '../services/displayNames.js';
import { computeChallengeNewResults } from '../services/FreePlayService.js';
import { parseWordTimes } from '../services/wordTiming.js';
import { assignCompetitionRanks } from 'models/ranking';
import { getDailyConfig } from '../services/dailyConfig.js';

export const freeplayRouter = Router();

interface HistoryEntry {
  sessionId: string;
  challengeId: string | null;
  date: string;
  completedAt: string;
  points: number;
  wordCount: number;
  longestWord: string;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  // True when the caller is the originator of this challenge (their
  // session row id equals its challenge_id). Drives the "Recent
  // challenges" grouping and the new-results badge — neither makes sense
  // on a challenge the user merely joined.
  isOwner: boolean;
  // Number of other participants who completed since the caller last
  // opened the challenge view. Zero for non-owned rows.
  newResults: number;
  // Total players in this challenge (always >= 1 — counts the caller
  // alone for non-shared sessions). Drives the row's single-tap target
  // on the history page: 1 → solo results, 2+ → standings/compare view.
  playerCount: number;
  // The caller's rank inside the challenge (1 = top score). Null for
  // solo sessions where rank isn't meaningful. The history page surfaces
  // a "1st" badge only when rank === 1.
  rank: number | null;
}

// User's completed free-play games, newest first. Anonymous-session rows
// (user_id null) are invisible here by definition.
freeplayRouter.get('/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rawRows = await db
      .selectFrom('free_play_sessions')
      .select([
        'id',
        'challenge_id',
        'date',
        'completed_at',
        'last_viewed_at',
        'points',
        'word_count',
        'longest_word',
        'board_size',
        'time_limit',
        'min_word_length',
        'seed',
      ])
      .where('user_id', '=', req.userId!)
      .where('completed_at', 'is not', null)
      .orderBy('completed_at', 'desc')
      .limit(200)
      .execute();

    // Older free-play rows include any daily attempts that flowed through
    // /api/game/start before the daily-skip flag landed. Filter them out
    // by matching seed + config against the canonical daily for the row's
    // date so the free-play history stays dedicated to free-play games.
    // completed_at is non-null by the WHERE filter above; narrow the type
    // so downstream consumers (toISOString, getTime) don't need guards.
    const rows = rawRows.filter(
      (r): r is typeof r & { completed_at: Date } => !isDailyRow(r) && r.completed_at !== null,
    );

    // For every challenge the caller participated in (owned or joined),
    // pull every other participant once and reduce twice: a participant
    // count per challenge, and the new-results count for the rows the
    // caller owns. One query, two derived projections.
    const challengeIds = Array.from(
      new Set(rows.map((r) => r.challenge_id).filter((id): id is string => !!id)),
    );
    const playerCountByChallenge = new Map<string, number>();
    // Per-challenge rank lookup keyed by participant row id so we can
    // attach the caller's rank to each of their history entries.
    const rankByRowId = new Map<string, number>();
    let newResultsByChallenge = new Map<string, number>();
    if (challengeIds.length > 0) {
      const participants = await db
        .selectFrom('free_play_sessions')
        .select(['id', 'challenge_id', 'completed_at', 'points', 'word_count'])
        .where('challenge_id', 'in', challengeIds)
        .where('completed_at', 'is not', null)
        .execute() as { id: string; challenge_id: string | null; completed_at: Date; points: number; word_count: number }[];
      for (const p of participants) {
        const cid = p.challenge_id!;
        playerCountByChallenge.set(cid, (playerCountByChallenge.get(cid) ?? 0) + 1);
      }
      // Compute rank per challenge — competition-ranked on points so equal
      // points share a place (matches the challenge view's ranking exactly so
      // the badge and the standings agree). Word count and completion only
      // order the list within a tie; they no longer split the rank.
      const byChallenge = new Map<string, typeof participants>();
      for (const p of participants) {
        const list = byChallenge.get(p.challenge_id!) ?? [];
        list.push(p);
        byChallenge.set(p.challenge_id!, list);
      }
      for (const [, list] of byChallenge) {
        list.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.word_count !== a.word_count) return b.word_count - a.word_count;
          return a.completed_at.getTime() - b.completed_at.getTime();
        });
        for (const { item, rank } of assignCompetitionRanks(list, (p) => p.points)) {
          rankByRowId.set(item.id, rank);
        }
      }
      newResultsByChallenge = computeChallengeNewResults(
        rows
          .filter((r) => r.challenge_id && r.id === r.challenge_id)
          .map((r) => ({
            id: r.id,
            completed_at: r.completed_at,
            last_viewed_at: r.last_viewed_at,
          })),
        participants.map((p) => ({
          id: p.id,
          challenge_id: p.challenge_id!,
          completed_at: p.completed_at,
        })),
      );
    }

    const entries: HistoryEntry[] = rows.map((r) => {
      const isOwner = !!r.challenge_id && r.id === r.challenge_id;
      const playerCount = r.challenge_id
        ? playerCountByChallenge.get(r.challenge_id) ?? 1
        : 1;
      return {
        sessionId: r.id,
        challengeId: r.challenge_id,
        date: r.date,
        completedAt: r.completed_at.toISOString(),
        points: r.points,
        wordCount: r.word_count,
        longestWord: r.longest_word,
        boardSize: r.board_size,
        timeLimit: r.time_limit,
        minWordLength: r.min_word_length,
        isOwner,
        newResults: isOwner ? (newResultsByChallenge.get(r.id) ?? 0) : 0,
        playerCount,
        rank: r.challenge_id ? rankByRowId.get(r.id) ?? null : null,
      };
    });

    cachePrivate(res, 30);
    res.json({ entries });
  } catch (err) {
    console.error('Failed to fetch free-play history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Single-number summary for the landing-page badge. The caller's history
// can contain many challenges; this collapses them so the landing doesn't
// need to fetch the full history list just to render a dot.
freeplayRouter.get('/unread', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const ownedRows = await db
      .selectFrom('free_play_sessions')
      .select(['id', 'completed_at', 'last_viewed_at'])
      .where('user_id', '=', req.userId!)
      .whereRef('id', '=', 'challenge_id')
      .where('completed_at', 'is not', null)
      .execute() as { id: string; completed_at: Date; last_viewed_at: Date | null }[];

    if (ownedRows.length === 0) {
      cachePrivate(res, 15);
      return res.json({ count: 0 });
    }

    const participants = await db
      .selectFrom('free_play_sessions')
      .select(['id', 'challenge_id', 'completed_at'])
      .where('challenge_id', 'in', ownedRows.map((r) => r.id))
      .where('completed_at', 'is not', null)
      .execute() as { id: string; challenge_id: string | null; completed_at: Date }[];

    const counts = computeChallengeNewResults(
      ownedRows.map((r) => ({
        id: r.id,
        completed_at: r.completed_at,
        last_viewed_at: r.last_viewed_at,
      })),
      participants.map((p) => ({
        id: p.id,
        challenge_id: p.challenge_id!,
        completed_at: p.completed_at,
      })),
    );

    let total = 0;
    for (const n of counts.values()) total += n;

    cachePrivate(res, 15);
    res.json({ count: total });
  } catch (err) {
    console.error('Failed to fetch unread challenge count:', err);
    res.status(500).json({ error: 'Failed to fetch unread' });
  }
});

// Full payload to replay the saved game on the results page — found
// words, recomputed missed words, board, and config. Restricted to the
// session owner so historic results stay private.
freeplayRouter.get('/session/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const db = getDb();
    const row = await db
      .selectFrom('free_play_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!row) return res.status(404).json({ error: 'Session not found' });
    if (row.user_id !== req.userId!) {
      return res.status(403).json({ error: 'Cannot view another player\'s session' });
    }
    // Mid-game sessions don't have a results view yet — the player needs
    // to finish (or time out) before the saved-replay payload makes sense.
    if (!row.completed_at) {
      return res.status(404).json({ error: 'Session not finished' });
    }
    const completedAt = row.completed_at;

    const board: string[][] = typeof row.board === 'string' ? JSON.parse(row.board) : row.board;
    const foundWords: string[] = typeof row.found_words === 'string'
      ? JSON.parse(row.found_words)
      : row.found_words;

    const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
    const wordTimes = parseWordTimes(row.word_times);
    const timeByWord = new Map(
      foundWords.map((w, i) => [w.toUpperCase(), wordTimes[i] ?? null]),
    );
    const all = findAllWords(board, dictionary, row.min_word_length);
    const found = all
      .filter((w) => foundSet.has(w.word))
      .map((w) => ({
        word: w.word,
        path: w.path,
        score: scoreWord(w.word),
        timeSeconds: timeByWord.get(w.word) ?? null,
      }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);
    const missed = all
      .filter((w) => !foundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    cachePrivate(res, 60);
    res.json({
      sessionId: row.id,
      challengeId: row.challenge_id,
      seed: row.seed,
      completedAt: completedAt.toISOString(),
      board,
      foundWords: found,
      missedWords: missed,
      config: {
        boardSize: row.board_size,
        timeLimit: row.time_limit,
        minWordLength: row.min_word_length,
      },
    });
  } catch (err) {
    console.error('Failed to fetch free-play session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Promotes the caller's completed free-play session into a shareable
// challenge. Idempotent: if challenge_id is already set we return it
// unchanged (so re-sharing the same game stays stable). The challenge id
// IS the originator session id — no separate challenges table required.
freeplayRouter.post('/share/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const db = getDb();
    const row = await db
      .selectFrom('free_play_sessions')
      .select(['id', 'user_id', 'challenge_id', 'completed_at'])
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!row) return res.status(404).json({ error: 'Session not found' });
    if (row.user_id !== req.userId!) {
      return res.status(403).json({ error: 'Cannot share another player\'s session' });
    }
    // Sharing a still-in-progress session would surface a challenge link
    // that points at an incomplete row — the share endpoint stays gated
    // on finalization so recipients always land on a finished baseline.
    if (!row.completed_at) {
      return res.status(409).json({ error: 'Session not finished' });
    }

    if (row.challenge_id) {
      return res.json({ challengeId: row.challenge_id });
    }

    await db
      .updateTable('free_play_sessions')
      .set({ challenge_id: row.id })
      .where('id', '=', row.id)
      .execute();

    res.json({ challengeId: row.id });
  } catch (err) {
    console.error('Failed to create challenge share:', err);
    res.status(500).json({ error: 'Failed to share' });
  }
});

// "Has the caller played this challenge?" — used by ConfigRoute to decide
// whether to send a returning player into the game or straight to the
// challenge results page. No replays allowed.
freeplayRouter.get('/challenge/:challengeId/me', requireAuth, async (req, res) => {
  const { challengeId } = req.params;
  try {
    const db = getDb();
    const row = await db
      .selectFrom('free_play_sessions')
      .select('id')
      .where('challenge_id', '=', challengeId)
      .where('user_id', '=', req.userId!)
      .where('completed_at', 'is not', null)
      .executeTakeFirst();
    res.json({ played: !!row, sessionId: row?.id ?? null });
  } catch (err) {
    console.error('Failed to check challenge participation:', err);
    res.status(500).json({ error: 'Failed to check participation' });
  }
});

// Lightweight metadata for a challenge link — owner name, config, player
// count — without requiring the caller has played. Used by the accept
// page so recipients see "Challenge from Alex" before they start.
freeplayRouter.get('/challenge/:challengeId/preview', requireAuth, async (req, res) => {
  const { challengeId } = req.params;
  try {
    const db = getDb();
    const rows = await db
      .selectFrom('free_play_sessions')
      .select([
        'id',
        'user_id',
        'board_size',
        'min_word_length',
        'time_limit',
        'seed',
      ])
      .where('challenge_id', '=', challengeId)
      .where('completed_at', 'is not', null)
      .execute();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const ownerRow = rows.find((r) => r.id === challengeId) ?? rows[0];
    const ownerName = ownerRow.user_id
      ? (await getDisplayNames([ownerRow.user_id])).get(ownerRow.user_id) ?? 'Anonymous'
      : 'Anonymous';

    const alreadyPlayed = rows.some((r) => r.user_id === req.userId!);

    // No caching — `alreadyPlayed` and `playerCount` need to flip
    // immediately after the caller finishes the challenge so the confirm
    // page redirects them on the next visit instead of serving a stale
    // "not played yet" response.
    res.json({
      challengeId,
      ownerUserId: ownerRow.user_id,
      ownerDisplayName: ownerName,
      playerCount: rows.length,
      alreadyPlayed,
      config: {
        boardSize: ownerRow.board_size,
        minWordLength: ownerRow.min_word_length,
        timeLimit: ownerRow.time_limit,
      },
      seed: ownerRow.seed,
    });
  } catch (err) {
    console.error('Failed to fetch challenge preview:', err);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

// Full challenge payload: board + per-player word lists + standings,
// ready to render the compare/leaderboard view in one round trip.
freeplayRouter.get('/challenge/:challengeId', requireAuth, async (req, res) => {
  const { challengeId } = req.params;
  try {
    const db = getDb();
    const rawRows = await db
      .selectFrom('free_play_sessions')
      .selectAll()
      .where('challenge_id', '=', challengeId)
      .where('completed_at', 'is not', null)
      .execute();
    // Narrow completed_at to non-null for the downstream toISOString /
    // localeCompare calls. The WHERE clause is the runtime guarantee.
    const rows = rawRows.filter(
      (r): r is typeof r & { completed_at: Date } => r.completed_at !== null,
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const meRow = rows.find((r) => r.user_id === req.userId!);
    if (!meRow) {
      return res.status(403).json({ error: 'You have not played this challenge' });
    }

    // The originator's row carries challenge_id === its own id, so it
    // doubles as the challenge's authoritative config + board.
    const ownerRow = rows.find((r) => r.id === challengeId) ?? rows[0];
    const board: string[][] = typeof ownerRow.board === 'string'
      ? JSON.parse(ownerRow.board)
      : ownerRow.board;

    // Caller-specific missed list: every valid word on the board the
    // caller didn't find, so the "All words" toggle on the results page
    // can show what was on the table.
    const myWords: string[] = typeof meRow.found_words === 'string'
      ? JSON.parse(meRow.found_words)
      : meRow.found_words;
    const myFoundSet = new Set(myWords.map((w) => w.toUpperCase()));
    const allWords = findAllWords(board, dictionary, ownerRow.min_word_length);
    const missedWords = allWords
      .filter((w) => !myFoundSet.has(w.word))
      .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

    const userIds = rows.map((r) => r.user_id).filter((id): id is string => !!id);
    const nameMap = await getDisplayNames(userIds);

    const players = rows.map((r) => {
      const words: string[] = typeof r.found_words === 'string'
        ? JSON.parse(r.found_words)
        : r.found_words;
      const wordTimes = parseWordTimes(r.word_times);
      return {
        userId: r.user_id,
        displayName: r.user_id ? nameMap.get(r.user_id) ?? 'Anonymous' : 'Guest',
        sessionId: r.id,
        points: r.points,
        wordCount: r.word_count,
        longestWord: r.longest_word,
        completedAt: r.completed_at.toISOString(),
        foundWords: words.map((word, i) => ({
          word,
          score: scoreWord(word),
          timeSeconds: wordTimes[i] ?? null,
        })),
        isOwner: r.id === challengeId,
        isYou: r.user_id === req.userId!,
      };
    });

    // Display order is points desc, then word count, then earliest completion
    // — a stable order so the list doesn't jitter between requests. Rank,
    // though, is competition-ranked on points alone: equal points share a
    // place (1, 1, 3), and the secondary keys only decide who's listed first
    // within a tie, never the number shown next to them.
    players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wordCount !== a.wordCount) return b.wordCount - a.wordCount;
      return a.completedAt.localeCompare(b.completedAt);
    });
    const rankedPlayers = assignCompetitionRanks(players, (p) => p.points).map(
      ({ item, rank }) => ({ ...item, rank }),
    );

    // Drain the "new results" badge for the owner the moment they open
    // the challenge view. Fire-and-forget so a transient write failure
    // doesn't break the response — at worst the badge sticks around for
    // one more refresh.
    if (ownerRow.user_id === req.userId!) {
      db.updateTable('free_play_sessions')
        .set({ last_viewed_at: new Date() })
        .where('id', '=', ownerRow.id)
        .execute()
        .catch((err) => {
          console.warn('Failed to update last_viewed_at:', (err as Error).message);
        });
    }

    cachePrivate(res, 15);
    res.json({
      challengeId,
      board,
      config: {
        boardSize: ownerRow.board_size,
        minWordLength: ownerRow.min_word_length,
        timeLimit: ownerRow.time_limit,
      },
      seed: ownerRow.seed,
      ownerUserId: ownerRow.user_id,
      players: rankedPlayers,
      missedWords,
    });
  } catch (err) {
    console.error('Failed to fetch challenge:', err);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// True when a free_play_sessions row was actually a daily attempt that
// got recorded before the dedicated daily-skip flag. We match the row's
// seed and its full config against the canonical daily for that date —
// the conjunction is tight enough that a non-daily collision is
// effectively impossible (a 32-bit seed match plus identical config on
// the right calendar day).
function isDailyRow(row: {
  date: string;
  seed: number | null;
  board_size: number;
  time_limit: number;
  min_word_length: number;
}): boolean {
  if (row.seed == null) return false;
  const dailySeed = getDailySeed(row.date);
  if (row.seed !== dailySeed) return false;
  const dailyConfig = getDailyConfig(row.date);
  return (
    row.board_size === dailyConfig.boardSize &&
    row.time_limit === dailyConfig.timeLimit &&
    row.min_word_length === dailyConfig.minWordLength
  );
}
