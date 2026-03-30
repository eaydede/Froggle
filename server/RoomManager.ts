import path from 'path';
import { fileURLToPath } from 'url';
import { Game, GameState, Position, generateSalt, hashWord } from 'models';
import { generateBoard } from 'engine/board.js';
import { isValidPath } from 'engine/adjacency.js';
import { loadDictionary, isValidWord } from 'engine/dictionary.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RoomPlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  wordCount: number;
  score: number;
  connected: boolean;
}

interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  words: { word: string; path: Position[]; score: number }[];
  connected: boolean;
}

interface RoomData {
  code: string;
  players: Map<string, RoomPlayer>;
  game: Game | null;
  validWordHashes: Set<string>;
  wordSalt: string;
  timer: NodeJS.Timeout | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, RoomData>();
  private dictionary: Set<string>;

  constructor() {
    const dictionaryPath = path.join(__dirname, '../enable1.txt');
    this.dictionary = loadDictionary(dictionaryPath);
  }

  createRoom(hostId: string, hostName: string): string {
    let code: string;
    do { code = generateCode(); } while (this.rooms.has(code));

    this.rooms.set(code, {
      code,
      players: new Map([[hostId, {
        id: hostId,
        name: hostName,
        isHost: true,
        words: [],
        connected: true,
      }]]),
      game: null,
      validWordHashes: new Set(),
      wordSalt: '',
      timer: null,
    });

    return code;
  }

  joinRoom(code: string, playerId: string, playerName: string): { success: boolean; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.game && room.game.status !== GameState.Config) {
      return { success: false, error: 'Game already in progress' };
    }
    if (room.players.size >= MAX_PLAYERS) return { success: false, error: 'Room is full' };
    if (room.players.has(playerId)) return { success: true };

    room.players.set(playerId, {
      id: playerId,
      name: playerName,
      isHost: false,
      words: [],
      connected: true,
    });

    return { success: true };
  }

  removePlayer(code: string, playerId: string): { newHostId?: string; shouldClose: boolean } {
    const room = this.rooms.get(code);
    if (!room) return { shouldClose: false };

    const player = room.players.get(playerId);
    if (!player) return { shouldClose: false };

    const gameInProgress = room.game && room.game.status === GameState.InProgress;

    if (gameInProgress) {
      // Keep the player's words but mark disconnected
      player.connected = false;
      return { shouldClose: false };
    }

    // Remove from lobby (or finished game)
    room.players.delete(playerId);
    if (room.players.size === 0) {
      this.closeRoom(code);
      return { shouldClose: true };
    }

    if (player.isHost) {
      const newHost = room.players.values().next().value!;
      newHost.isHost = true;
      return { shouldClose: false, newHostId: newHost.id };
    }

    return { shouldClose: false };
  }

  startGame(
    code: string,
    hostId: string,
    boardSize: number,
    durationSeconds: number,
    minWordLength: number,
    onTimerEnd: () => void,
  ): { success: boolean; error?: string; game?: Game; wordHashes?: string[]; salt?: string } {
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };

    const host = room.players.get(hostId);
    if (!host?.isHost) return { success: false, error: 'Only the host can start the game' };

    const board = generateBoard(boardSize);
    room.game = {
      board,
      startedAt: Date.now(),
      status: GameState.InProgress,
      config: { durationSeconds, boardSize, minWordLength },
    };

    // Reset all player words
    for (const p of room.players.values()) p.words = [];

    room.wordSalt = generateSalt();
    const allWords = findAllWords(board, this.dictionary, minWordLength);
    room.validWordHashes = new Set(allWords.map(w => hashWord(w.word, room.wordSalt)));

    if (durationSeconds > 0) {
      room.timer = setTimeout(() => {
        this.endGame(code);
        onTimerEnd();
      }, durationSeconds * 1000);
    }

    return {
      success: true,
      game: room.game,
      wordHashes: Array.from(room.validWordHashes),
      salt: room.wordSalt,
    };
  }

  submitWord(
    code: string,
    playerId: string,
    path: Position[],
  ): { valid: boolean; word?: string; reason?: string } {
    const room = this.rooms.get(code);
    if (!room || !room.game || room.game.status !== GameState.InProgress) {
      return { valid: false, reason: 'invalid' };
    }

    const player = room.players.get(playerId);
    if (!player) return { valid: false, reason: 'invalid' };
    if (!isValidPath(path)) return { valid: false, reason: 'invalid' };

    const word = path
      .map(pos => room.game!.board[pos.row][pos.col])
      .join('')
      .toUpperCase();

    if (word.length < room.game.config.minWordLength) return { valid: false, reason: 'invalid' };
    if (!isValidWord(this.dictionary, word.toLowerCase())) return { valid: false, reason: 'invalid' };
    if (player.words.some(w => w.word === word)) return { valid: false, word, reason: 'repeat' };

    const score = scoreWord(word);
    player.words.push({ word, path, score });
    return { valid: true, word };
  }

  endGame(code: string): void {
    const room = this.rooms.get(code);
    if (!room || !room.game || room.game.status !== GameState.InProgress) return;
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    room.game.status = GameState.Finished;
  }

  getPlayerInfos(code: string): RoomPlayerInfo[] {
    const room = this.rooms.get(code);
    if (!room) return [];
    return Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      wordCount: p.words.length,
      score: p.words.reduce((s, w) => s + w.score, 0),
      connected: p.connected,
    }));
  }

  getResults(code: string) {
    const room = this.rooms.get(code);
    if (!room || !room.game || room.game.status !== GameState.Finished) return null;

    const allWords = findAllWords(
      room.game.board,
      this.dictionary,
      room.game.config.minWordLength,
    );

    const allFoundSet = new Set<string>();
    const players = Array.from(room.players.values()).map(p => {
      for (const w of p.words) allFoundSet.add(w.word);
      return {
        id: p.id,
        name: p.name,
        foundWords: p.words,
        totalScore: p.words.reduce((s, w) => s + w.score, 0),
      };
    });
    players.sort((a, b) => b.totalScore - a.totalScore);

    const missedWords = allWords
      .filter(w => !allFoundSet.has(w.word))
      .map(w => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
      .sort((a, b) => b.score - a.score);

    return { board: room.game.board, players, missedWords };
  }

  getRoom(code: string): RoomData | undefined {
    return this.rooms.get(code);
  }

  closeRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room?.timer) clearTimeout(room.timer);
    this.rooms.delete(code);
  }
}
