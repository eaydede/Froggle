import { Game, GameState, Word, Position } from 'models';
import { generateBoard } from 'engine/board.js';
import { isValidPath } from 'engine/adjacency.js';
import { loadDictionary, isValidWord } from 'engine/dictionary.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GameController {
  private game: Game | null = null;
  private words: Word[] = [];
  private timer: NodeJS.Timeout | null = null;
  private dictionary: Set<string>;

  constructor() {
    // Load dictionary once when controller is created
    const dictionaryPath = path.join(__dirname, '../enable1.txt');
    this.dictionary = loadDictionary(dictionaryPath);
  }

  createGame(): Game {
    // Clear any existing game
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Create a game in Config state with empty board
    this.game = {
      board: [],
      startedAt: 0,
      status: GameState.Config,
      config: {
        durationSeconds: 180,
        boardSize: 4,
        minWordLength: 3,
      },
    };
    this.words = [];

    return this.game;
  }

  startGame(durationSeconds: number, boardSize: number = 4, minWordLength: number = 3): Game {
    if (!this.game || this.game.status !== GameState.Config) {
      throw new Error('Cannot start game: game not in Config state');
    }

    const board = generateBoard(boardSize);
    this.game = {
      board,
      startedAt: Date.now(),
      status: GameState.InProgress,
      config: {
        durationSeconds,
        boardSize,
        minWordLength,
      },
    };
    this.words = [];

    // Start timer (only if not unlimited)
    if (durationSeconds > 0) {
      this.timer = setTimeout(() => {
        this.endGame();
      }, durationSeconds * 1000);
    }

    return this.game;
  }

  cancelGame(): void {
    // Cancel game in any state - reset everything
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.game = null;
    this.words = [];
  }

  endGame(): Game | null {
    // End game (either manually or when timer expires)
    if (!this.game || this.game.status !== GameState.InProgress) {
      return null;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.game.status = GameState.Finished;
    return this.game;
  }

  submitWord(path: Position[]): { valid: boolean; word?: string; reason?: string } {
    if (!this.game || this.game.status !== GameState.InProgress) {
      return { valid: false, reason: 'No active game' };
    }

    // Derive word from path
    const word = path.map(pos => this.game!.board[pos.row][pos.col]).join('').toUpperCase();

    // Validate path structure
    if (!isValidPath(path)) {
      return { valid: false, word, reason: 'Invalid path' };
    }

    // Validate word length meets minimum requirement
    const minLength = this.game.config.minWordLength;
    if (word.length < minLength) {
      return { valid: false, word, reason: `Word too short (minimum ${minLength} letters)` };
    }

    if (!isValidWord(this.dictionary, word.toLowerCase())) {
      return { valid: false, word, reason: 'Not in dictionary' };
    }

    // Check if already submitted
    if (this.words.some(w => w.word.toLowerCase() === word.toLowerCase())) {
      return { valid: false, word, reason: 'Already submitted' };
    }

    // Valid word - add it
    const newWord: Word = {
      word,
      path,
      submittedAt: Date.now(),
    };
    this.words.push(newWord);

    return { valid: true, word };
  }

  getGameState(): { game: Game | null; words: Word[] } {
    return {
      game: this.game,
      words: [...this.words],
    };
  }
}
