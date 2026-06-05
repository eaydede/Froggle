import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRoom,
  endBoard,
  getRoom,
  joinRoom,
  setBoardCompletionHandler,
  startBoard,
  type RoomBoardCompletion,
} from './store.js';

// The store defers a finished board's history write until the post-end grace
// window closes, because submitWord keeps accepting a final in-flight word for
// GRACE_PERIOD_MS after the board ends. These tests pin that timing: the write
// must not fire at the instant of ending, it must capture a word that lands
// during the grace window, and a fast next round must flush the pending write
// (with the real words) exactly once before it resets per-player state.
//
// A grace-window submission is simulated by mutating the player record the way
// submitWord does — the dictionary/path validity of submitWord is orthogonal
// to the persistence timing under test here.

describe('room board history persistence', () => {
  let completions: RoomBoardCompletion[];

  beforeEach(() => {
    vi.useFakeTimers();
    completions = [];
    setBoardCompletionHandler((c) => {
      completions.push(c);
    });
  });

  afterEach(() => {
    setBoardCompletionHandler(() => {});
    vi.useRealTimers();
  });

  // Start a board and put the sole player in a known scored state, as if they
  // had found one word during play.
  function setupEndedBoard() {
    const { code } = createRoom();
    joinRoom(code, 'key-1', 'Alice', 'user-1');
    startBoard(code, () => {});

    const player = getRoom(code)!.players[0];
    player.foundWords = ['HELLO'];
    player.points = 1;
    player.wordCount = 1;

    endBoard(code);
    return { code, player };
  }

  it('does not write at the instant the board ends', () => {
    setupEndedBoard();
    expect(completions).toHaveLength(0);
  });

  it('captures a word that lands during the grace window after the board ends', () => {
    const { player } = setupEndedBoard();

    // A final word arrives within the grace window — submitWord would accept it
    // and mutate the player record after endBoard already ran.
    player.foundWords = ['HELLO', 'WORLD'];
    player.points = 2;
    player.wordCount = 2;

    vi.advanceTimersByTime(1000);

    expect(completions).toHaveLength(1);
    const me = completions[0].participants[0];
    expect(me.userId).toBe('user-1');
    expect(me.foundWords).toEqual(['HELLO', 'WORLD']);
    expect(me.points).toBe(2);
    expect(me.wordCount).toBe(2);
  });

  it('flushes the pending write before the next round resets player state', () => {
    const { code, player } = setupEndedBoard();

    // Host starts the next round before the grace timer fires. The pending
    // write must flush with the finished board's real words, not the reset.
    startBoard(code, () => {});

    expect(completions).toHaveLength(1);
    expect(completions[0].participants[0].foundWords).toEqual(['HELLO']);
    // The new board has reset the player's per-board state.
    expect(player.foundWords).toEqual([]);

    // The original deferred timer must not fire a second (empty) write.
    vi.advanceTimersByTime(1000);
    expect(completions).toHaveLength(1);
  });

  it('writes exactly once per board after the grace window', () => {
    setupEndedBoard();
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(completions).toHaveLength(1);
  });
});
