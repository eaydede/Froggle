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

export class GameController {
  private game: Game | null = null;
  private words: Word[] = [];
  private timer: NodeJS.Timeout | null = null;
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

    // Minimum word counts by board size — below these thresholds the game is no fun
    const MIN_WORDS: Record<number, number> = { 4: 15, 5: 30, 6: 50 };
    const minWords = MIN_WORDS[boardSize] ?? 15;
    const MAX_RETRIES = 10;

    // Always have a seed — use provided one or generate a new one.
    // If the generated board has too few words, retry with a fresh seed.
    let usedSeed = seed ?? randomSeed();
    let board: string[][];
    let allWords: FoundWord[];

    if (predefinedBoard && predefinedBoard.length === boardSize) {
      // Shared/predefined board — use as-is regardless of word count
      board = predefinedBoard;
      allWords = findAllWords(board, this.dictionary, minWordLength);
    } else {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        board = generateSeededBoard(boardSize, usedSeed);
        allWords = findAllWords(board, this.dictionary, minWordLength);
        if (allWords.length >= minWords) break;
        if (attempt < MAX_RETRIES - 1) usedSeed = randomSeed();
      }
    }

    this.game = {
      board: board!,
      startedAt: Date.now(),
      status: GameState.InProgress,
      config: {
        durationSeconds,
        boardSize,
        minWordLength,
      },
    };
    this.words = [];

    // Hash all valid words for client-side cheat prevention
    this.wordSalt = generateSalt();
    this.validWordHashes = new Set(allWords!.map(w => hashWord(w.word, this.wordSalt)));

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
      seed: usedSeed,
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
      return { valid: false, reason: 'invalid' };
    }

    // Derive word from path
    const word = path.map(pos => this.game!.board[pos.row][pos.col]).join('').toUpperCase();

    // Validate path structure
    if (!isValidPath(path)) {
      return { valid: false, word, reason: 'invalid' };
    }

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
