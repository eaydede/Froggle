import { randomUUID } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scoreWord } from 'engine/scoring.js';
import { dockerAvailable, startTestDb, type TestDb } from '../test/pgHarness.js';
import { boardWithWords } from '../test/fixtures.js';
import { getDailyZenConfig } from './dailyZenConfig.js';
import {
  endSession,
  getZenLeaderboard,
  startSession,
  submitWord,
} from './DailyZenService.js';

const DATE = '2026-05-01';
const config = getDailyZenConfig(DATE); // fixed: 5x5, minWordLength 4

const DUMMY_BOARD = JSON.stringify(
  Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A')),
);

async function zenRow(h: TestDb, foundWords: string[]) {
  await h.db
    .insertInto('daily_zen_results')
    .values({
      user_id: randomUUID(),
      date: DATE,
      board: DUMMY_BOARD,
      found_words: JSON.stringify(foundWords),
      is_competitive: true,
      ended_at: new Date(),
    })
    .execute();
}

// Characterization of the zen submit + finalize lifecycle and — importantly —
// the CURRENT (buggy) leaderboard ranking, captured before the fix so PR-1
// visibly flips the tie assertion from [1,2] to [1,1].
describe.runIf(dockerAvailable())('zen lifecycle (characterization, DB)', () => {
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

  it('accepts a valid word and accrues gap-capped active time', async () => {
    const { board, words } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startSession(h.db, userId, DATE, board, true);

    // Backdate last activity by 10s so the gap credit is observable.
    await h.db
      .updateTable('daily_zen_results')
      .set({ last_active_at: new Date(Date.now() - 10_000) })
      .where('user_id', '=', userId)
      .where('date', '=', DATE)
      .execute();

    const res = await submitWord(h.db, userId, DATE, words[0].path);
    expect(res).toMatchObject({ valid: true, word: words[0].word, score: scoreWord(words[0].word) });

    const row = await h.db
      .selectFrom('daily_zen_results')
      .select(['points', 'word_count', 'active_seconds'])
      .where('user_id', '=', userId)
      .where('date', '=', DATE)
      .executeTakeFirstOrThrow();
    expect(row.points).toBe(scoreWord(words[0].word));
    expect(row.word_count).toBe(1);
    expect(Number(row.active_seconds)).toBeGreaterThanOrEqual(9);
    expect(Number(row.active_seconds)).toBeLessThanOrEqual(60); // ACTIVE_TIME_GAP_CAP_SECONDS
  });

  it('rejects a duplicate submission with reason "repeat"', async () => {
    const { board, words } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startSession(h.db, userId, DATE, board, true);

    await submitWord(h.db, userId, DATE, words[0].path);
    const dup = await submitWord(h.db, userId, DATE, words[0].path);
    expect(dup).toEqual({ valid: false, reason: 'repeat' });
  });

  it('endSession marks ended_by_player and stamps ended_at', async () => {
    const { board } = boardWithWords(config.boardSize, config.minWordLength);
    const userId = randomUUID();
    await startSession(h.db, userId, DATE, board, true);

    await endSession(h.db, userId, DATE);

    const row = await h.db
      .selectFrom('daily_zen_results')
      .select(['ended_at', 'ended_by_player'])
      .where('user_id', '=', userId)
      .where('date', '=', DATE)
      .executeTakeFirstOrThrow();
    expect(row.ended_at).not.toBeNull();
    expect(row.ended_by_player).toBe(true);
  });

  // BUG DOCUMENTATION: two players with equal points but different word counts
  // should share rank 1 (competition ranking). Today the zen leaderboard ranks
  // by array index after a points-then-wordCount sort, so it splits them into
  // ranks 1 and 2. PR-1 will change the expected ranks below to [1, 1].
  it('CURRENT (buggy) ranking splits a tie into ranks 1 and 2', async () => {
    await zenRow(h, ['ABCDEF']); // one 6-letter word  → 5 points, 1 word
    await zenRow(h, ['ABC', 'DEF', 'GHI', 'JKL', 'MNO']); // five 3-letter words → 5 points, 5 words

    const lb = await getZenLeaderboard(h.db, DATE, undefined);
    const points = lb.rankings.points;

    expect(points.map((p) => p.points)).toEqual([5, 5]);
    expect(points.map((p) => p.rank)).toEqual([1, 2]); // <-- buggy: should become [1, 1]
    // Current tiebreak sorts the higher word count first.
    expect(points[0].wordCount).toBe(5);
    expect(points[1].wordCount).toBe(1);
  });
});
