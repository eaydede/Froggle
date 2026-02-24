import { Game, GameStatus, Board, Word, Position } from 'models';
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
  private onGameEnd: (() => void) | null = null;

  constructor() {
    // Load dictionary once when controller is created
    const dictionaryPath = path.join(__dirname, '../enable1.txt');
    this.dictionary = loadDictionary(dictionaryPath);
  }

  startGame(durationSeconds: number): Game {
    // Clear any existing game
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const board = generateBoard();
    this.game = {
      board,
      startedAt: Date.now(),
      durationSeconds,
      status: GameStatus.InProgress,
    };
    this.words = [];

    // Start timer
    this.timer = setTimeout(() => {
      this.endGame();
    }, durationSeconds * 1000);

    return this.game;
  }

  submitWord(path: Position[]): { valid: boolean; word?: string; reason?: string } {
    if (!this.game || this.game.status !== GameStatus.InProgress) {
      return { valid: false, reason: 'No active game' };
    }

    // Derive word from path
    const word = path.map(pos => this.game!.board[pos.row][pos.col]).join('').toUpperCase();

    // Validate path structure
    if (!isValidPath(path)) {
      return { valid: false, word, reason: 'Invalid path' };
    }

    // Validate word is in dictionary (min 3 letters)
    if (word.length < 3) {
      return { valid: false, word, reason: 'Word too short (minimum 3 letters)' };
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

  private endGame(): void {
    if (this.game) {
      this.game.status = GameStatus.Finished;
    }
    if (this.onGameEnd) {
      this.onGameEnd();
    }
  }

  setOnGameEnd(callback: () => void): void {
    this.onGameEnd = callback;
  }

  cleanup(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
