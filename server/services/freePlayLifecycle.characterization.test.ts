import { randomUUID } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scoreWord } from 'engine/scoring.js';
import { dockerAvailable, startTestDb, type TestDb } from '../test/pgHarness.js';
import { boardWithWords } from '../test/fixtures.js';
import { startFreePlaySession, submitFreePlayWord } from './FreePlayService.js';

const BOARD_SIZE = 5;
const MIN_WORD_LENGTH = 4;

// Characterizes free-play (solo) submit ahead of / alongside the move onto the
// shared validateSubmission core. The FOR UPDATE transaction and finalize paths
// stay in the service; only the validate/derive/score middle is shared.
describe.runIf(dockerAvailable())('free-play lifecycle (characterization, DB)', () => {
  let h: TestDb;
  beforeAll(async () => {
    h = await startTestDb();
  }, 180_000);
  afterAll(async () => {
    await h?.stop();
  });
  beforeEach(async () => {
    await h.truncateAll();
  });

  function start(userId: string, board: string[][]) {
    return startFreePlaySession(h.db, {
      userId,
      durationSeconds: 120,
      boardSize: BOARD_SIZE,
      minWordLength: MIN_WORD_LENGTH,
      predefinedBoard: board,
      challengeId: null,
    });
  }

  async function aggregates(userId: string) {
    return h.db
      .selectFrom('free_play_sessions')
      .select(['points', 'word_count', 'longest_word'])
      .where('user_id', '=', userId)
      .where('completed_at', 'is', null)
      .executeTakeFirstOrThrow();
  }

  it('accepts a valid word and updates points/wordCount/longestWord', async () => {
    const { board, words } = boardWithWords(BOARD_SIZE, MIN_WORD_LENGTH);
    const userId = randomUUID();
    await start(userId, board);

    const short = words[0];
    const long = words[words.length - 1];

    const r1 = await submitFreePlayWord(h.db, userId, short.path);
    expect(r1).toMatchObject({ valid: true, word: short.word, score: scoreWord(short.word) });
    const r2 = await submitFreePlayWord(h.db, userId, long.path);
    expect(r2).toMatchObject({ valid: true, word: long.word });

    const agg = await aggregates(userId);
    expect(agg.points).toBe(scoreWord(short.word) + scoreWord(long.word));
    expect(agg.word_count).toBe(2);
    expect(agg.longest_word).toBe(long.word);
  });

  it('rejects a duplicate submission with reason "repeat"', async () => {
    const { board, words } = boardWithWords(BOARD_SIZE, MIN_WORD_LENGTH);
    const userId = randomUUID();
    await start(userId, board);

    await submitFreePlayWord(h.db, userId, words[0].path);
    const dup = await submitFreePlayWord(h.db, userId, words[0].path);
    expect(dup).toEqual({ valid: false, reason: 'repeat' });
  });

  it('rejects a sub-minimum-length path with reason "invalid"', async () => {
    const { board, words } = boardWithWords(BOARD_SIZE, MIN_WORD_LENGTH);
    const userId = randomUUID();
    await start(userId, board);

    const res = await submitFreePlayWord(h.db, userId, [words[0].path[0]]);
    expect(res).toEqual({ valid: false, reason: 'invalid' });
  });
});
