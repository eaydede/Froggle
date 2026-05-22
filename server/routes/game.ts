import { Router } from 'express';
import { GameState, type Game } from 'models';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/index.js';
import {
  buildFreePlayResults,
  cancelFreePlaySession,
  endFreePlaySession,
  getActiveFreePlaySession,
  solveFreePlayBoard,
  startFreePlaySession,
  submitFreePlayWord,
  type FreePlaySession,
} from '../services/FreePlayService.js';

export const gameRouter = Router();

// Default config used by /create to seed the client's "Config" gate. The
// real config is supplied by the player on /start; these defaults exist
// only so the ConfigRoute has a Game-shaped object to gate on.
const DEFAULT_CONFIG = {
  durationSeconds: 180,
  boardSize: 4,
  minWordLength: 3,
} as const;

function toGame(session: FreePlaySession): Game {
  return {
    board: session.board,
    startedAt: session.started_at.getTime(),
    status: session.completed_at ? GameState.Finished : GameState.InProgress,
    config: {
      durationSeconds: session.time_limit,
      boardSize: session.board_size,
      minWordLength: session.min_word_length,
    },
  };
}

// Returns a placeholder Config-state Game so ConfigRoute can render its
// setup screen. No server-side state is mutated — the actual session row
// is created on /start. The legacy sessionId field is preserved in the
// response shape for client backward compatibility but is no longer
// consulted on subsequent calls.
gameRouter.post('/create', (_req, res) => {
  const game: Game = {
    board: [],
    startedAt: 0,
    status: GameState.Config,
    config: { ...DEFAULT_CONFIG },
  };
  res.json({ game, sessionId: 'noop' });
});

gameRouter.post('/start', requireAuth, async (req, res) => {
  const { durationSeconds, boardSize, minWordLength, board, seed, challengeId } = req.body;
  try {
    const { session, salt, wordHashes } = await startFreePlaySession(getDb(), {
      userId: req.userId!,
      durationSeconds: durationSeconds || 180,
      boardSize: boardSize || 4,
      minWordLength: minWordLength || 3,
      predefinedBoard: board,
      seed,
      challengeId: typeof challengeId === 'string' && challengeId ? challengeId : null,
    });
    res.json({
      game: toGame(session),
      wordHashes,
      salt,
      seed: session.seed,
    });
  } catch (err) {
    console.error('Failed to start free-play session:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

gameRouter.post('/cancel', requireAuth, async (req, res) => {
  try {
    await cancelFreePlaySession(getDb(), req.userId!);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to cancel free-play session:', err);
    res.status(500).json({ error: 'Failed to cancel game' });
  }
});

gameRouter.post('/end', requireAuth, async (req, res) => {
  try {
    const session = await endFreePlaySession(getDb(), req.userId!);
    if (!session) {
      return res.status(400).json({ error: 'No active game to end' });
    }
    res.json({ game: toGame(session), freePlaySessionId: session.id });
  } catch (err) {
    console.error('Failed to end free-play session:', err);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

gameRouter.post('/submit', requireAuth, async (req, res) => {
  try {
    const result = await submitFreePlayWord(getDb(), req.userId!, req.body.path);
    res.json(result);
  } catch (err) {
    console.error('Failed to submit free-play word:', err);
    res.status(500).json({ error: 'Failed to submit word' });
  }
});

// Returns the caller's active in-progress session, or null if none. The
// salt + wordHashes are included so a refresh-resumed client can re-arm
// its local validator without an extra round trip.
gameRouter.get('/active', requireAuth, async (req, res) => {
  try {
    const session = await getActiveFreePlaySession(getDb(), req.userId!);
    if (!session) return res.json({ session: null });
    const { salt, wordHashes } = solveFreePlayBoard(session.board, session.min_word_length);
    res.json({
      session: {
        id: session.id,
        game: toGame(session),
        found_words: session.found_words,
        challenge_id: session.challenge_id,
        seed: session.seed,
        salt,
        wordHashes,
      },
    });
  } catch (err) {
    console.error('Failed to fetch active free-play session:', err);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

// Returns the same shape /active returns. Retained so the existing
// useGameApi.fetchGameState path keeps working without changes — the
// game object reflects the current DB state (status flips to Finished
// after expiry), and words are the persisted found_words list.
gameRouter.get('/state', requireAuth, async (req, res) => {
  try {
    const session = await getActiveFreePlaySession(getDb(), req.userId!);
    if (!session) return res.json({ game: null, words: [] });
    res.json({
      game: toGame(session),
      words: session.found_words.map((word) => ({
        word,
        path: [],
        submittedAt: 0,
      })),
    });
  } catch (err) {
    console.error('Failed to fetch free-play state:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

gameRouter.get('/results', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    // Force finalization on read so a player whose timer ran out without
    // /end firing still gets their results page. endFreePlaySession is a
    // no-op when the row already finalized.
    let session = await getActiveFreePlaySession(db, req.userId!);
    if (session) {
      session = await endFreePlaySession(db, req.userId!);
    } else {
      // Fall back to the player's most recently finished session.
      session = await endFreePlaySession(db, req.userId!);
    }
    if (!session) {
      return res.status(400).json({ error: 'No finished game' });
    }
    const results = buildFreePlayResults(session);
    res.json({ ...results, freePlaySessionId: session.id });
  } catch (err) {
    console.error('Failed to fetch free-play results:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});
