import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GameController } from './GameController.js';
import { getDailySeed } from 'models/seedCode';
import { generateSeededBoard } from 'engine/board.js';
import { scoreWord } from 'engine/scoring.js';
import { authMiddleware, requireAuth } from './middleware/auth.js';
import { getDb } from './db/index.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { scoreResult, scoreWords, getDailyStats } from './services/DailyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Auth middleware — extracts user ID from Supabase JWT on all /api routes
app.use('/api', authMiddleware);

// Serve static files from the client build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Session management
const sessions = new Map<string, { controller: GameController; lastActivity: number }>();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

function generateSessionId(): string {
  return crypto.randomUUID();
}

function getSession(sessionId: string | undefined): { controller: GameController; lastActivity: number } | null {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastActivity = Date.now();
  return session;
}

// Periodically clean up stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      session.controller.cancelGame();
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Middleware to extract session ID from header
function sessionMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  (req as any).sessionId = req.headers['x-session-id'] as string | undefined;
  next();
}

app.use('/api', sessionMiddleware);

// Create a new game (in Config state)
app.post('/api/game/create', (req, res) => {
  const sessionId = generateSessionId();
  const controller = new GameController();
  const game = controller.createGame();
  sessions.set(sessionId, { controller, lastActivity: Date.now() });
  res.json({ game, sessionId });
});

// Start the game (transition from Config to InProgress)
app.post('/api/game/start', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const { durationSeconds, boardSize, minWordLength, board, seed } = req.body;
  const resolvedBoardSize = boardSize || 4;
  try {
    const result = session.controller.startGame(
      durationSeconds || 180, 
      resolvedBoardSize, 
      minWordLength || 3,
      board,
      seed
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Cancel the game in any state (Config or InProgress)
app.post('/api/game/cancel', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  session.controller.cancelGame();
  sessions.delete((req as any).sessionId);
  res.json({ success: true });
});

// End game early (transition to Finished state, keep words)
app.post('/api/game/end', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const game = session.controller.endGame();
  if (game) {
    res.json({ game });
  } else {
    const state = session.controller.getGameState();
    if (state.game) {
      res.json({ game: state.game });
    } else {
      res.status(400).json({ error: 'No active game to end' });
    }
  }
});

// Submit a word
app.post('/api/game/submit', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const { path } = req.body;
  const result = session.controller.submitWord(path);
  res.json(result);
});

// Get current game state
app.get('/api/game/state', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.json({ game: null, words: [] });

  const state = session.controller.getGameState();
  res.json(state);
});

// Get results after game ends
app.get('/api/game/results', (req, res) => {
  const session = getSession((req as any).sessionId);
  if (!session) return res.status(401).json({ error: 'Invalid session' });

  const results = session.controller.getResults();
  if (results) {
    res.json(results);
  } else {
    res.status(400).json({ error: 'No finished game' });
  }
});

// Daily puzzle configuration
const DAILY_LAUNCH_DATE = '2026-04-10';
const DAILY_BOARD_SIZE = 5;
const DAILY_TIME_LIMIT = 120;
const DAILY_MIN_WORD_LENGTH = 4;

function getDailyDatePST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function getDailyNumber(dateStr: string): number {
  const launch = new Date(DAILY_LAUNCH_DATE + 'T00:00:00Z');
  const current = new Date(dateStr + 'T00:00:00Z');
  const diffMs = current.getTime() - launch.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

// Get today's daily puzzle info
app.get('/api/daily', (_req, res) => {
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

// User endpoint — returns current user info from JWT
app.get('/api/user/me', requireAuth, (req, res) => {
  res.json({
    id: req.userId,
  });
});

// Get user profile (display name from Supabase user metadata)
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(req.userId!);

    if (error || !data.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const displayName = data.user.user_metadata?.display_name || 'Anonymous';
    res.json({ display_name: displayName });
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (display name stored in Supabase user metadata)
app.put('/api/user/profile', requireAuth, async (req, res) => {
  const { display_name } = req.body;

  if (typeof display_name !== 'string' || display_name.trim().length === 0) {
    return res.status(400).json({ error: 'display_name must be a non-empty string' });
  }

  const trimmed = display_name.trim().slice(0, 20);

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.updateUserById(req.userId!, {
      user_metadata: { display_name: trimmed },
    });

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ display_name: data.user.user_metadata?.display_name || trimmed });
  } catch (err) {
    console.error('Failed to update user profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Record daily result
app.post('/api/daily/results', requireAuth, async (req, res) => {
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
      .onConflict((oc) => oc
        .columns(['user_id', 'date'])
        .doUpdateSet({
          found_words: JSON.stringify(found_words),
          board: JSON.stringify(board),
          completed_at: new Date(),
          points,
          word_count: wordCount,
          longest_word: longestWord,
        })
      )
      .execute();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to record daily result:', err);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// Get daily result for a specific date
app.get('/api/daily/results/:date', requireAuth, async (req, res) => {
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

    res.json({
      result: {
        date: result.date,
        found_words: result.found_words,
        board: result.board,
        completed_at: result.completed_at,
      },
    });
  } catch (err) {
    console.error('Failed to fetch daily result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// Get leaderboard for a specific date
// Returns fully computed rankings and player stats ready for display
app.get('/api/daily/leaderboard/:date', async (req, res) => {
  const { date } = req.params;
  const requestingUserId = req.userId; // may be undefined if not authenticated

  try {
    const db = getDb();
    const admin = getSupabaseAdmin();

    const results = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('date', '=', date)
      .execute();

    const totalPlayers = results.length;

    if (totalPlayers === 0) {
      return res.json({
        puzzleNumber: getDailyNumber(date),
        totalPlayers: 0,
        rankings: { points: [], words: [], rarity: [] },
        currentPlayer: null,
      });
    }

    // Fetch display names
    const userMap = new Map<string, string>();
    for (const r of results) {
      try {
        const { data } = await admin.auth.admin.getUserById(r.user_id);
        userMap.set(r.user_id, data.user?.user_metadata?.display_name || 'Anonymous');
      } catch {
        userMap.set(r.user_id, 'Anonymous');
      }
    }

    // Build word frequency map across all players
    const wordCounts = new Map<string, number>();
    const parsedResults = results.map((r) => {
      const words: string[] = typeof r.found_words === 'string'
        ? JSON.parse(r.found_words)
        : r.found_words;
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
      return { ...r, words };
    });

    // Score each player
    const scored = parsedResults.map((r) => {
      const points = scoreWords(r.words);
      const wordCount = r.words.length;
      const rarityScore = Math.round(
        r.words.reduce((sum, w) => {
          const base = scoreWord(w);
          const freq = wordCounts.get(w) || 1;
          return sum + base * (2 - freq / totalPlayers);
        }, 0) * 10,
      ) / 10;
      const longest = r.words.reduce((a, b) => (b.length > a.length ? b : a), '');

      return {
        userId: r.user_id,
        displayName: userMap.get(r.user_id) || 'Anonymous',
        words: r.words,
        points,
        wordCount,
        rarityScore,
        longestWord: longest.toUpperCase(),
        wordFrequencies: Object.fromEntries(
          r.words.map((w) => [w, wordCounts.get(w) || 0]),
        ),
      };
    });

    // Build rankings for each type
    function buildRankings(
      sortKey: 'points' | 'wordCount' | 'rarityScore',
      subLabelKey: 'wordCount' | 'points',
      subLabelSuffix: string,
    ) {
      const sorted = [...scored].sort((a, b) => b[sortKey] - a[sortKey]);
      return sorted.map((p, i) => ({
        rank: i + 1,
        displayName: p.displayName,
        value: Math.round(p[sortKey]),
        subLabel: `${p[subLabelKey]} ${subLabelSuffix}`,
        isCurrentUser: p.userId === requestingUserId,
      }));
    }

    const rankings = {
      points: buildRankings('points', 'wordCount', 'words'),
      words: buildRankings('wordCount', 'points', 'pts'),
      rarity: buildRankings('rarityScore', 'wordCount', 'words'),
    };

    // Build current player card data
    let currentPlayer = null;
    if (requestingUserId) {
      const me = scored.find((p) => p.userId === requestingUserId);
      if (me) {
        const pointsRank = rankings.points.find((r) => r.isCurrentUser)!.rank;

        // Pick accolade
        const wordsByRarity = [...me.words].sort(
          (a, b) => (me.wordFrequencies[a] || totalPlayers) - (me.wordFrequencies[b] || totalPlayers),
        );

        let accolade = '';
        if (wordsByRarity.length > 0) {
          const rarestWord = wordsByRarity[0];
          const freq = me.wordFrequencies[rarestWord] || totalPlayers;
          const pct = Math.round((freq / totalPlayers) * 100);

          if (pct <= 10) {
            accolade = `Only <b>${pct}%</b> of players found <b>${rarestWord.toUpperCase()}</b>`;
          } else {
            const rareWords = me.words.filter(
              (w) => ((me.wordFrequencies[w] || totalPlayers) / totalPlayers) * 100 <= 10,
            );
            if (rareWords.length >= 2) {
              accolade = `You found <b>${rareWords.length} words</b> that less than 10% of players spotted`;
            }
          }
        }

        if (!accolade && me.wordCount > 0) {
          const avg = (me.points / me.wordCount).toFixed(1);
          accolade = `Your avg word scored <b>${avg} pts</b>`;
        }

        if (!accolade) {
          accolade = 'Keep playing to earn accolades!';
        }

        const topPercent = Math.round((pointsRank / totalPlayers) * 100);

        currentPlayer = {
          points: me.points,
          wordsFound: me.wordCount,
          longestWord: me.longestWord,
          rank: pointsRank,
          totalPlayers,
          topPercent: topPercent <= 30 ? topPercent : null,
          accolade,
        };
      }
    }

    res.json({
      puzzleNumber: getDailyNumber(date),
      totalPlayers,
      rankings,
      currentPlayer,
    });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get current user's daily result history with pre-computed stats
app.get('/api/daily/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const results = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('user_id', '=', req.userId!)
      .orderBy('date', 'desc')
      .execute();

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

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

// Get daily stats page payload — history, streak, averages, rankings.
// Single endpoint per the "endpoint-per-page" pattern; the client renders
// directly from this shape.
app.get('/api/daily/stats', requireAuth, async (req, res) => {
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

// Serve client for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
