import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { dockerAvailable, startTestDb, type TestDb } from '../../test/pgHarness.js';
import * as timed from '../timed-daily/repository.js';
import * as zen from '../zen/repository.js';
import * as gauntlet from '../gauntlet/repository.js';
import * as money from '../time-is-money/repository.js';
import * as freeplay from '../free-play/repository.js';
import { getInsights } from './service.js';
import { persistRoomBoardResults } from '../free-play/service.js';

vi.mock('../profile/publicNames.js', () => ({
  getDisplayNames: async (ids: string[]) => new Map(ids.map((id) => [id, 'Player'])),
}));

describe.runIf(dockerAvailable())('results insights and timing (DB)', () => {
  let h: TestDb;
  const user = randomUUID();
  const other = randomUUID();
  const board = JSON.stringify(Array.from({ length: 4 }, () => ['A', 'B', 'C', 'D']));
  const progress = {
    nextWords: ['OLD', 'CAME'],
    aggregate: { points: 3, wordCount: 2, longestWord: 'CAME' },
  };
  beforeAll(async () => {
    h = await startTestDb();
  }, 180_000);
  afterAll(async () => {
    await h?.stop();
  });
  beforeEach(async () => {
    await h.truncateAll();
  });

  it('records accepted find times in every persisted mode without inventing historical times', async () => {
    const common = {
      user_id: user,
      date: '2026-11-12',
      board,
      found_words: JSON.stringify(['OLD']),
      started_at: new Date(Date.now() - 10_000),
    };
    const config = { board_size: 4, time_limit: 120, min_word_length: 4 };
    await h.db
      .insertInto('daily_results')
      .values({ ...common, ...config })
      .execute();
    await timed.saveWords(h.db, progress, user, common.date);
    await h.db
      .insertInto('daily_time_is_money_results')
      .values({ ...common, ...config })
      .execute();
    await money.saveWords(h.db, progress, user, common.date);
    await h.db
      .insertInto('daily_gauntlet_results')
      .values({
        ...common,
        ...config,
        round_index: 0,
        round_kind: 'regular',
        modifier: JSON.stringify({ kind: 'regular' }),
      })
      .execute();
    await gauntlet.saveWords(h.db, progress, user, common.date, 0);
    await h.db
      .insertInto('daily_zen_results')
      .values({ ...common, active_seconds: 20 })
      .execute();
    await zen.saveWords(h.db, progress, new Date(), 4, user, common.date);
    await h.db
      .insertInto('free_play_sessions')
      .values({ ...common, ...config })
      .execute();
    await h.db.transaction().execute(async (trx) => {
      const session = await freeplay.lockActiveSession(trx, user);
      await freeplay.saveWords(trx, progress, session!);
    });
    for (const table of [
      'daily_results',
      'daily_time_is_money_results',
      'daily_gauntlet_results',
      'daily_zen_results',
      'free_play_sessions',
    ] as const) {
      const row = await h.db.selectFrom(table).select('word_times').executeTakeFirstOrThrow();
      expect(row.word_times?.OLD).toBeUndefined();
      expect(row.word_times?.CAME).toBeGreaterThan(0);
    }
    const row = await h.db
      .selectFrom('daily_zen_results')
      .select(['word_times', 'active_seconds'])
      .executeTakeFirstOrThrow();
    expect(row.word_times?.CAME).toBe(24);
    expect(row.active_seconds).toBe(24);
  });

  it('only exposes completed results on the requested board after the viewer finishes', async () => {
    const start = new Date('2026-11-12T12:00:00Z');
    const common = {
      board,
      board_size: 4,
      time_limit: 120,
      min_word_length: 4,
      found_words: JSON.stringify([]),
    };
    await h.db
      .insertInto('daily_results')
      .values([
        {
          ...common,
          user_id: user,
          date: '2026-11-12',
          started_at: start,
          ended_at: new Date(+start + 120000),
          found_words: JSON.stringify(['CAME']),
        },
        { ...common, user_id: other, date: '2026-11-12', started_at: start, ended_at: null },
        {
          ...common,
          user_id: other,
          date: '2026-11-11',
          started_at: new Date(+start - 86400000),
          ended_at: new Date(+start - 86400000 + 120000),
          found_words: JSON.stringify(['SCAMS']),
        },
      ])
      .execute();
    const insights = await getInsights(h.db, user, { mode: 'timed', date: '2026-11-12' });
    expect(insights.players).toHaveLength(1);
    expect(insights.players[0]).toMatchObject({
      isYou: true,
      duration: 120,
      timeLimit: 120,
      finds: [{ word: 'CAME', score: 2, time: null }],
    });
    await expect(
      getInsights(h.db, other, { mode: 'timed', date: '2026-11-12' }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('protects private free-play sessions and uses only the shared challenge as the field', async () => {
    const sessionId = randomUUID();
    const start = new Date('2026-11-12T12:00:00Z');
    const common = {
      date: '2026-11-12',
      board,
      board_size: 4,
      min_word_length: 4,
      time_limit: 120,
      started_at: start,
      completed_at: new Date(+start + 120_000),
      challenge_id: sessionId,
      seed: 1,
    };
    await h.db
      .insertInto('free_play_sessions')
      .values([
        { ...common, id: sessionId, user_id: user },
        { ...common, user_id: other },
        { ...common, user_id: randomUUID(), challenge_id: null },
      ])
      .execute();
    expect((await getInsights(h.db, user, { mode: 'freeplay', sessionId })).players).toHaveLength(
      2,
    );
    await expect(getInsights(h.db, other, { mode: 'freeplay', sessionId })).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('keeps Time is Money runs beyond the starting clock and Zen active time', async () => {
    const start = new Date('2026-11-12T12:00:00Z');
    await h.db
      .insertInto('daily_time_is_money_results')
      .values({
        user_id: user,
        date: '2026-11-12',
        board,
        board_size: 4,
        min_word_length: 4,
        time_limit: 60,
        started_at: start,
        ended_at: new Date(+start + 180_000),
        found_words: JSON.stringify(['CAME']),
        word_times: { CAME: 150 },
      })
      .execute();
    const money = await getInsights(h.db, user, { mode: 'money', date: '2026-11-12' });
    expect(money.players[0].duration).toBe(180);
    expect(money.players[0].finds[0].time).toBe(150);
    await h.db
      .insertInto('daily_zen_results')
      .values({
        user_id: user,
        date: '2026-11-12',
        board,
        started_at: start,
        ended_at: new Date(+start + 86400_000),
        active_seconds: 90,
        found_words: JSON.stringify(['CAME']),
        word_times: { CAME: 80 },
      })
      .execute();
    const zen = await getInsights(h.db, user, { mode: 'zen', date: '2026-11-12' });
    expect(zen.players[0].duration).toBe(90);
  });
  it('keeps actual early finish times separate from the replay time allowance', async () => {
    const start = new Date('2026-11-12T12:00:00Z');
    const common = { board, board_size: 4, min_word_length: 4, time_limit: 120 };
    await h.db
      .insertInto('daily_results')
      .values([
        {
          ...common,
          user_id: user,
          date: '2026-11-12',
          started_at: start,
          ended_at: new Date(+start + 1000),
          found_words: JSON.stringify(['CAME', 'SCAM']),
          word_times: { CAME: 0.2, SCAM: 0.5 },
        },
        {
          ...common,
          user_id: other,
          date: '2026-11-12',
          started_at: start,
          ended_at: new Date(+start + 120000),
          found_words: JSON.stringify(['CAME']),
        },
      ])
      .execute();
    const { players } = await getInsights(h.db, user, { mode: 'timed', date: '2026-11-12' });
    expect(players.find((p) => p.isYou)).toMatchObject({ duration: 1, timeLimit: 120 });
    expect(players.find((p) => !p.isYou)).toMatchObject({ duration: 120, timeLimit: 120 });
  });

  it('includes earned time in the Time is Money replay allowance', async () => {
    const start = new Date('2026-11-12T12:00:00Z');
    await h.db
      .insertInto('daily_time_is_money_results')
      .values({
        user_id: user,
        date: '2026-11-12',
        board,
        board_size: 4,
        min_word_length: 4,
        time_limit: 60,
        started_at: start,
        ended_at: new Date(+start + 1000),
        found_words: JSON.stringify(['CAME']),
        word_times: { CAME: 0.5 },
      })
      .execute();
    const { players } = await getInsights(h.db, user, { mode: 'money', date: '2026-11-12' });
    expect(players[0].duration).toBe(1);
    expect(players[0].timeLimit).toBe(64);
  });

  it('preserves individual room finish times in saved challenge results', async () => {
    const start = +new Date('2026-11-12T12:00:00Z');
    await persistRoomBoardResults(h.db, {
      seed: 1,
      board: JSON.parse(board),
      config: { boardSize: 4, minWordLength: 4, durationSeconds: 120 },
      startedAt: start,
      endedAt: start + 120000,
      hostUserId: user,
      participants: [
        {
          userId: user,
          foundWords: ['CAME'],
          wordTimes: { CAME: 20 },
          finishedAt: start + 30000,
          points: 2,
          wordCount: 1,
          longestWord: 'CAME',
        },
        {
          userId: other,
          foundWords: ['SCAMS'],
          wordTimes: { SCAMS: 100 },
          finishedAt: start + 120000,
          points: 3,
          wordCount: 1,
          longestWord: 'SCAMS',
        },
      ],
    });
    const stored = await h.db
      .selectFrom('free_play_sessions')
      .selectAll()
      .where('user_id', '=', user)
      .executeTakeFirstOrThrow();
    expect(+stored.completed_at!).toBe(start + 30000);
    const { players } = await getInsights(h.db, user, { mode: 'freeplay', sessionId: stored.id });
    expect(players.find((p) => p.isYou)).toMatchObject({ duration: 30, timeLimit: 120 });
    expect(players.find((p) => !p.isYou)).toMatchObject({ duration: 120, timeLimit: 120 });
  });
});
