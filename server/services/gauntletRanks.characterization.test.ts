import { randomUUID } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dockerAvailable, startTestDb, type TestDb } from '../test/pgHarness.js';
import { getGauntletAggregate, getGauntletRoundRanks } from './DailyGauntletService.js';

const DATE = '2026-05-21';
const DUMMY_BOARD = JSON.stringify(
  Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A')),
);
const MODIFIER = JSON.stringify({ kind: 'regular' });

async function gauntletRow(
  h: TestDb,
  userId: string,
  roundIndex: number,
  points: number,
  completedAt: string,
) {
  const ts = new Date(completedAt);
  await h.db
    .insertInto('daily_gauntlet_results')
    .values({
      user_id: userId,
      date: DATE,
      round_index: roundIndex,
      round_kind: 'regular',
      board: DUMMY_BOARD,
      modifier: MODIFIER,
      points,
      board_size: 5,
      min_word_length: 4,
      time_limit: 90,
      ended_at: ts,
      completed_at: ts,
    })
    .execute();
}

// Confirms the gauntlet rank surfaces tie correctly end-to-end through the DB:
// per-round ranks share a place on equal points, and the aggregate shares a
// place on equal rank-sum.
describe.runIf(dockerAvailable())('gauntlet ranks (characterization, DB)', () => {
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

  it('per-round ranks share a place for equal points (1, 1, 3)', async () => {
    const u1 = randomUUID();
    const u2 = randomUUID();
    const u3 = randomUUID();
    await gauntletRow(h, u1, 0, 10, '2026-05-21T12:00:00Z');
    await gauntletRow(h, u2, 0, 10, '2026-05-21T12:01:00Z'); // tie with u1
    await gauntletRow(h, u3, 0, 5, '2026-05-21T12:02:00Z');

    const ranks = await getGauntletRoundRanks(h.db, DATE);
    const byUser = new Map(ranks.map((r) => [r.user_id, r.rank]));
    expect(byUser.get(u1)).toBe(1);
    expect(byUser.get(u2)).toBe(1); // shared place on equal points
    expect(byUser.get(u3)).toBe(3); // gap skipped
  });

  it('aggregate shares a place for an equal rank-sum across all rounds', async () => {
    const u1 = randomUUID();
    const u2 = randomUUID();
    // Both finish all three rounds tied on points every round → identical
    // per-round ranks → identical rank-sum → shared aggregate rank.
    for (let round = 0; round < 3; round++) {
      await gauntletRow(h, u1, round, 10, `2026-05-21T12:0${round}:00Z`);
      await gauntletRow(h, u2, round, 10, `2026-05-21T12:1${round}:00Z`);
    }

    const agg = await getGauntletAggregate(h.db, DATE);
    expect(agg.map((e) => e.aggregateRank)).toEqual([1, 1]);
    expect(agg.every((e) => e.rankSum === 3)).toBe(true);
  });
});
