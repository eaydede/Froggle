import { describe, expect, it } from 'vitest';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { dictionary } from '../services/dictionary.js';
import { createRoom, getRoom, joinRoom, startBoard, submitWord } from './store.js';

// In-memory characterization of multiplayer submitWord. The validate/derive/
// dedupe/score middle now delegates to the shared engine core; these lock the
// outcomes (including the rejected-word surfaced for the client toast) and the
// in-memory player-aggregate update.
describe('multiplayer submitWord (characterization)', () => {
  // Starts a board and bypasses the pre-board countdown so words can land.
  function liveBoard() {
    const { code } = createRoom();
    joinRoom(code, 'key-1', 'Alice', 'user-1');
    startBoard(code, () => {});
    const room = getRoom(code)!;
    const player = room.players[0];
    const board = room.currentBoard!;
    board.startedAt = Date.now() - 1000; // past the countdown
    player.status = 'playing';
    const words = findAllWords(board.board, dictionary, board.config.minWordLength)
      .sort((a, b) => a.word.length - b.word.length);
    return { code, player, board, words };
  }

  it('accepts a valid word and updates the player aggregate', () => {
    const { code, player, words } = liveBoard();
    const short = words[0];
    const long = words[words.length - 1];

    const r1 = submitWord(code, player.id, short.path);
    expect(r1?.outcome).toEqual({ valid: true, word: short.word, score: scoreWord(short.word) });
    const r2 = submitWord(code, player.id, long.path);
    expect(r2?.outcome).toEqual({ valid: true, word: long.word, score: scoreWord(long.word) });

    expect(player.foundWords).toEqual([short.word, long.word]);
    expect(player.points).toBe(scoreWord(short.word) + scoreWord(long.word));
    expect(player.wordCount).toBe(2);
  });

  it('rejects a duplicate with reason "repeat" and surfaces the word', () => {
    const { code, player, words } = liveBoard();
    submitWord(code, player.id, words[0].path);
    const dup = submitWord(code, player.id, words[0].path);
    expect(dup?.outcome).toEqual({ valid: false, word: words[0].word, reason: 'repeat' });
  });

  it('rejects a non-adjacent path as invalid with no derived word', () => {
    const { code, player, board } = liveBoard();
    const last = board.config.boardSize - 1;
    const res = submitWord(code, player.id, [{ row: 0, col: 0 }, { row: last, col: last }]);
    expect(res?.outcome).toEqual({ valid: false, reason: 'invalid' });
  });

  it('records rejected attempts (repeat + invalid) on the player', () => {
    const { code, player, board, words } = liveBoard();
    submitWord(code, player.id, words[0].path); // valid
    submitWord(code, player.id, words[0].path); // repeat
    const last = board.config.boardSize - 1;
    const invalidPath = [{ row: 0, col: 0 }, { row: last, col: last }];
    submitWord(code, player.id, invalidPath); // invalid (non-adjacent)

    expect(player.invalidSubmissions).toHaveLength(2);
    expect(player.invalidSubmissions[0]).toMatchObject({ word: words[0].word, reason: 'repeat' });
    expect(player.invalidSubmissions[0].path).toEqual(words[0].path);
    expect(player.invalidSubmissions[1]).toMatchObject({ word: '', reason: 'invalid' });
    expect(player.invalidSubmissions[1].path).toEqual(invalidPath);
    expect(typeof player.invalidSubmissions[1].t).toBe('number');
  });
});
