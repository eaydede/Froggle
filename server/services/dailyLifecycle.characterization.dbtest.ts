import { randomUUID } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scoreWord } from 'engine/scoring.js';
import { dockerAvailable, startTestDb, type TestDb } from '../test/pgHarness.js';
import { boardWithWords } from '../test/fixtures.js';
import { getDailyConfig } from './dailyConfig.js';
import {
  endTimedDailySession,
  getTimedDailySession,
  startTimedDailySession,
  submitTimedDailyWord,
} from './DailyService.js';

// Legacy date → fixed config (5x5, minWordLength 4, 120s). submit derives its
// config from getDailyConfig(date), so the fixture board must match this.
const DATE = '2026-04-15';
const config = getDailyConfig(DATE);

// Characterization of the timed-daily submit + finalize lifecycle as it
// behaves today, ahead of the Level-A extraction. These assertions must keep
// passing identically after submitTimedDailyWord/endTimedDailySession are
// reimplemented on the shared session core.
describe.runIf(dockerAvailable())('timed daily lifecycle (characterization, DB)', () => {
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

  it('accepts a valid word and updates points/wordCount/longestWord', async () => {
    const { board, words } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startTimedDailySession(h.db, userId, DATE, board, config);

    const short = words[0];
    const long = words[words.length - 1];

    const r1 = await submitTimedDailyWord(h.db, userId, DATE, short.path);
    expect(r1).toMatchObject({ valid: true, word: short.word, score: scoreWord(short.word) });

    const r2 = await submitTimedDailyWord(h.db, userId, DATE, long.path);
    expect(r2).toMatchObject({ valid: true, word: long.word });

    const session = await getTimedDailySession(h.db, userId, DATE);
    expect(session?.found_words).toEqual([short.word, long.word]);
    expect(session?.points).toBe(scoreWord(short.word) + scoreWord(long.word));
    expect(session?.word_count).toBe(2);
    expect(session?.longest_word).toBe(long.word);
  });

  it('rejects a duplicate submission with reason "repeat"', async () => {
    const { board, words } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startTimedDailySession(h.db, userId, DATE, board, config);

    await submitTimedDailyWord(h.db, userId, DATE, words[0].path);
    const dup = await submitTimedDailyWord(h.db, userId, DATE, words[0].path);
    expect(dup).toEqual({ valid: false, reason: 'repeat' });
  });

  it('rejects a sub-minimum-length path with reason "invalid"', async () => {
    const { board, words } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startTimedDailySession(h.db, userId, DATE, board, config);

    // A single cell derives a one-letter "word", below minWordLength.
    const res = await submitTimedDailyWord(h.db, userId, DATE, [words[0].path[0]]);
    expect(res).toEqual({ valid: false, reason: 'invalid' });
  });

  it('player finalize on a fresh session stamps ended_at at ~now (below the cap)', async () => {
    const { board } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    const started = await startTimedDailySession(h.db, userId, DATE, board, config);

    const before = Date.now();
    const ended = await endTimedDailySession(h.db, userId, DATE);
    const after = Date.now();

    expect(ended?.ended_at).not.toBeNull();
    const endedMs = ended!.ended_at!.getTime();
    expect(endedMs).toBeGreaterThanOrEqual(before - 1000);
    expect(endedMs).toBeLessThanOrEqual(after + 1000);
    // Below the hard cap of started_at + time_limit.
    expect(endedMs).toBeLessThan(started.started_at.getTime() + config.timeLimit * 1000);
  });

  it('auto-finalizes an expired session on read, capped at started_at + time_limit', async () => {
    const { board } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startTimedDailySession(h.db, userId, DATE, board, config);

    // Backdate the start so the session is well past time_limit + grace.
    const pastStart = new Date(Date.now() - (config.timeLimit + 60) * 1000);
    await h.db
      .updateTable('daily_results')
      .set({ started_at: pastStart })
      .where('user_id', '=', userId)
      .where('date', '=', DATE)
      .execute();

    const session = await getTimedDailySession(h.db, userId, DATE);
    expect(session?.ended_at).not.toBeNull();
    // Capped exactly at started_at + time_limit, not "now".
    expect(session!.ended_at!.getTime()).toBe(pastStart.getTime() + config.timeLimit * 1000);
  });
});
