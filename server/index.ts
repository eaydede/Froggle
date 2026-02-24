import express from 'express';
import cors from 'cors';
import { GameController } from './GameController.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Single game controller instance for single-player
const gameController = new GameController();

// Start a new game
app.post('/api/game/start', (req, res) => {
  const { durationSeconds } = req.body;
  const game = gameController.startGame(durationSeconds || 180);
  res.json({ game });
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
