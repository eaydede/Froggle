import { Game, GameState, Word, Position, hashWord, generateSalt } from 'models';
import { generateBoard, generateSeededBoard } from 'engine/board.js';
import { randomSeed } from 'models/seedCode';
import { isValidPath } from 'engine/adjacency.js';
import { loadDictionary, isValidWord } from 'engine/dictionary.js';
import { findAllWords, FoundWord } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRACE_PERIOD_MS = 500;

export class GameController {
  private game: Game | null = null;
  private words: Word[] = [];
  private timer: NodeJS.Timeout | null = null;
  private finishedAt: number | null = null;
  private dictionary: Set<string>;
  private validWordHashes: Set<string> = new Set();
  private wordSalt: string = '';

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

  startGame(durationSeconds: number, boardSize: number = 4, minWordLength: number = 3, predefinedBoard?: string[][], seed?: number): { game: Game; wordHashes: string[]; salt: string; seed: number } {
    if (!this.game || this.game.status !== GameState.Config) {
      throw new Error('Cannot start game: game not in Config state');
    }

    // Always have a seed — use provided one or generate a new one
    const gameSeed = seed ?? randomSeed();
    const board = predefinedBoard && predefinedBoard.length === boardSize
      ? predefinedBoard
      : generateSeededBoard(boardSize, gameSeed);
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

    // Find all valid words and hash them
    this.wordSalt = generateSalt();
    const allWords = findAllWords(board, this.dictionary, minWordLength);
    this.validWordHashes = new Set(allWords.map(w => hashWord(w.word, this.wordSalt)));

    // Start timer (only if not unlimited)
    if (durationSeconds > 0) {
      this.timer = setTimeout(() => {
        this.endGame();
      }, durationSeconds * 1000);
    }

    return {
      game: this.game,
      wordHashes: Array.from(this.validWordHashes),
      salt: this.wordSalt,
      seed: gameSeed,
    };
  }

  cancelGame(): void {
    // Cancel game in any state - reset everything
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.game = null;
    this.words = [];
    this.finishedAt = null;
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
    this.finishedAt = Date.now();
    return this.game;
  }

  submitWord(path: Position[]): { valid: boolean; word?: string; reason?: string } {
    if (!this.game) {
      return { valid: false, reason: 'invalid' };
    }

    // Accept submissions if the game is in progress, or if it just finished
    // and we're within the grace period (catches in-flight requests at timer expiry)
    const inGracePeriod = this.game.status === GameState.Finished
      && this.finishedAt !== null
      && (Date.now() - this.finishedAt) <= GRACE_PERIOD_MS;

    if (this.game.status !== GameState.InProgress && !inGracePeriod) {
      return { valid: false, reason: 'invalid' };
    }

    // Validate path structure (including bounds check) before accessing board
    if (!isValidPath(path, this.game.config.boardSize)) {
      return { valid: false, reason: 'invalid' };
    }

    // Derive word from path (safe now that bounds are validated)
    const word = path.map(pos => this.game!.board[pos.row][pos.col]).join('').toUpperCase();

    // Validate word length meets minimum requirement
    const minLength = this.game.config.minWordLength;
    if (word.length < minLength) {
      return { valid: false, word, reason: 'invalid' };
    }

    if (!isValidWord(this.dictionary, word.toLowerCase())) {
      return { valid: false, word, reason: 'invalid' };
    }

    // Check if already submitted
    if (this.words.some(w => w.word.toLowerCase() === word.toLowerCase())) {
      return { valid: false, word, reason: 'repeat' };
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

  getResults(): {
    board: string[][];
    foundWords: { word: string; path: Position[]; score: number }[];
    missedWords: { word: string; path: Position[]; score: number }[];
  } | null {
    if (!this.game || this.game.status !== GameState.Finished) {
      return null;
    }

    const allWords = findAllWords(this.game.board, this.dictionary, this.game.config.minWordLength);
    const foundWordSet = new Set(this.words.map(w => w.word.toUpperCase()));

    const foundWords = this.words.map(w => ({
      word: w.word,
      path: w.path,
      score: scoreWord(w.word),
    }));

    const missedWords = allWords
      .filter(w => !foundWordSet.has(w.word))
      .map(w => ({
        word: w.word,
        path: w.path,
        score: scoreWord(w.word),
      }));

    foundWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);
    missedWords.sort((a, b) => b.score - a.score || b.word.length - a.word.length);

    return {
      board: this.game.board,
      foundWords,
      missedWords,
    };
  }
}
