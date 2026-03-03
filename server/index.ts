import express from 'express';
import cors from 'cors';
import { GameController } from './GameController.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Single game controller instance for single-player
const gameController = new GameController();

// Create a new game (in Config state)
app.post('/api/game/create', (req, res) => {
  const game = gameController.createGame();
  res.json({ game });
});

// Start the game (transition from Config to InProgress)
app.post('/api/game/start', (req, res) => {
  const { durationSeconds, boardSize, minWordLength } = req.body;
  try {
    const game = gameController.startGame(
      durationSeconds || 180, 
      boardSize || 4, 
      minWordLength || 3
    );
    res.json({ game });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Cancel the game in any state (Config or InProgress)
app.post('/api/game/cancel', (req, res) => {
  gameController.cancelGame();
  res.json({ success: true });
});

// End game early (transition to Finished state, keep words)
app.post('/api/game/end', (req, res) => {
  const game = gameController.endGame();
  if (game) {
    res.json({ game });
  } else {
    res.status(400).json({ error: 'No active game to end' });
  }
});

// Submit a word
app.post('/api/game/submit', (req, res) => {
  const { path } = req.body;
  const result = gameController.submitWord(path);
  res.json(result);
});

// Get current game state
app.get('/api/game/state', (req, res) => {
  const state = gameController.getGameState();
  res.json(state);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
