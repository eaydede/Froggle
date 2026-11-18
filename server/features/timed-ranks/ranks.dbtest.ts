import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dictionary } from '../../gameplay/dictionary.js';
import { dockerAvailable, startTestDb, type TestDb } from '../../test/pgHarness.js';
import { getDailyDatePST } from '../timed-daily/config.js';
import { startTimedDailySession } from '../timed-daily/service.js';
import { getInsights } from '../results/service.js';
import { boardKey } from './calibration.js';
import { latestModel, publishModel, listHistoricalGames } from './repository.js';
import { prepareRankTargets, refreshRankStatistics } from './service.js';
import { settingsKey } from './types.js';
import { MODEL_VERSION } from './calculation.js';
import { PRODUCTION_PROJECT_REF } from './production.js';

const settings = { mode: 'timed', boardSize: 4, timeLimit: 120, minWordLength: 3 } as const;

describe.runIf(dockerAvailable())('timed rank statistics and snapshots', () => {
  let h: TestDb;
  beforeAll(async () => { h = await startTestDb(); }, 180_000);
  afterAll(async () => { await h?.stop(); });
  beforeEach(async () => { await h.truncateAll(); });

  async function refreshFixtureStatistics(options: { beforeDate: string; write: boolean; recalibrate?: boolean; }) {
    return refreshRankStatistics(h.db, {
      ...options,
      history: await listHistoricalGames(h.db, options.beforeDate),
      sourceProjectRef: PRODUCTION_PROJECT_REF,
    });
  }

  async function seedHistory() {
    const fixtures = Array.from({ length: 5 }, (_, index) => {
      const board = generateSeededBoard(4, 100 + index);
      return { board, words: findAllWords(board, dictionary, 3).map(entry => entry.word) };
    });
    const rows = Array.from({ length: 50 }, (_, index) => {
      const fixture = fixtures[index % 5];
      return {
        user_id: randomUUID(), date: `2026-01-0${1 + index % 5}`,
        board: JSON.stringify(fixture.board), board_size: 4, min_word_length: 3, time_limit: 120,
        found_words: JSON.stringify(fixture.words.slice(0, index % 10)),
        ended_at: new Date('2026-01-06T00:00:00Z'),
      };
    });
    await h.db.insertInto('daily_results').values(rows).execute();
    return fixtures;
  }

  it('backfills unfound opportunities, ignores unfinished/current games, and reruns without double counting', async () => {
    const fixtures = await seedHistory();
    await h.db.insertInto('daily_results').values({
      user_id: randomUUID(), found_words: '[]', date: '2026-01-01', board: JSON.stringify(fixtures[0].board),
      board_size: 4, min_word_length: 3, time_limit: 120,
    }).execute();
    await h.db.insertInto('daily_results').values({
      user_id: randomUUID(), found_words: '[]', date: '1970-01-01', board: '[["X"]]',
      board_size: 1, min_word_length: 99, time_limit: 1, ended_at: new Date('1970-01-01T00:00:01Z'),
    }).execute();
    const dry = await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: false });
    expect(dry.games).toBe(50);
    expect(dry.excludedGames.unsupportedSettings).toBe(1);
    expect(await h.db.selectFrom('timed_rank_models').selectAll().execute()).toHaveLength(0);
    expect(dry.cohorts[settingsKey(settings)].supported).toBe(true);

    const first = await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: true });
    const second = await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: true });
    expect(second.modelVersion).toBe(first.modelVersion);
    expect(await h.db.selectFrom('timed_rank_models').selectAll().execute()).toHaveLength(1);
    const counts = await h.db.selectFrom('timed_word_statistics').selectAll().execute();
    const example = fixtures[0].words[fixtures[0].words.length - 1];
    const expectedOpportunities = fixtures.filter(fixture => fixture.words.includes(example)).length * 10;
    expect(counts.find(row => row.word === example)).toMatchObject({ opportunities: expectedOpportunities });
    expect(counts.some(row => row.finds === 0)).toBe(true);
    expect(counts.every(row => row.finds <= row.opportunities)).toBe(true);
    expect(counts.find(row => row.word === example)?.boards).toBe(expectedOpportunities / 10);
    const original = (await latestModel(h.db, '2026-02-01'))!;
    await publishModel(h.db, { ...original, version: `${MODEL_VERSION}:corrected-source`, cohorts: {} }, PRODUCTION_PROJECT_REF);
    expect((await latestModel(h.db, '2026-02-01'))?.version).toBe(`${MODEL_VERSION}:corrected-source`);
    await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: true, recalibrate: true });
    expect((await latestModel(h.db, '2026-02-01'))?.version).toBe(original.version);
  });

  it('freezes targets across players, concurrent starts, model refreshes, resume and completed insights', async () => {
    const fixtures = await seedHistory();
    await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: true });
    const board = fixtures[0].board;
    const date = getDailyDatePST();
    const users = [randomUUID(), randomUUID()];
    const sessions = await Promise.all(users.map(user => startTimedDailySession(h.db, user, date, board, settings)));
    expect(sessions[0].rankTargets?.thresholds).toHaveLength(5);
    expect(sessions[1].rankTargets).toEqual(sessions[0].rankTargets);

    const model = (await latestModel(h.db, date))!;
    await publishModel(h.db, { ...model, version: `${MODEL_VERSION}:changed`, throughDate: '2026-02-01', cohorts: {} }, PRODUCTION_PROJECT_REF);
    const resumed = await startTimedDailySession(h.db, users[0], date, board, settings);
    expect(resumed.rankTargets).toEqual(sessions[0].rankTargets);
    expect(await prepareRankTargets(h.db, board, settings, `timed:${date}`)).toEqual(sessions[0].rankTargets);
    expect(await prepareRankTargets(h.db, board, settings, 'different-puzzle')).toBeNull();

    await h.db.updateTable('daily_results').set({ ended_at: new Date() }).where('user_id', '=', users[0]).execute();
    await h.pool.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [users[0], { display_name: 'Player' }]);
    const insights = await getInsights(h.db, users[0], { mode: 'timed', date });
    expect(insights.rankTargets).toEqual(sessions[0].rankTargets);
  });

  it('freezes unsupported boards and leaves legacy sessions without retroactive titles', async () => {
    const board = generateSeededBoard(4, 999);
    const date = getDailyDatePST();
    const user = randomUUID();
    await h.db.insertInto('daily_results').values({
      user_id: user, date, found_words: '[]', board: JSON.stringify(board), board_size: 4, min_word_length: 3, time_limit: 120,
    }).execute();
    expect((await startTimedDailySession(h.db, user, date, board, settings)).rankTargets).toBeNull();
    expect(await prepareRankTargets(h.db, board, settings, 'unsupported')).toBeNull();
    await seedHistory();
    await refreshFixtureStatistics({ beforeDate: '2026-02-01', write: true });
    expect(await prepareRankTargets(h.db, board, settings, 'unsupported')).toBeNull();
    expect(await prepareRankTargets(h.db, board, settings, 'new-puzzle')).not.toBeNull();
  });

  it('keeps model data server-only and enforces count integrity in the database', async () => {
    await h.pool.query("insert into timed_rank_models (version, source_project_ref, through_date, cohorts) values ('test', $1, '2026-01-01', '{}')", [PRODUCTION_PROJECT_REF]);
    await expect(h.pool.query("insert into timed_word_statistics values ('test', 'timed:4:120:3', 'CATS', 1, 2, 1)")).rejects.toMatchObject({ code: '23514' });
    const client = await h.pool.connect();
    try {
      await client.query('set role anon');
      await expect(client.query('select * from timed_word_statistics')).rejects.toMatchObject({ code: '42501' });
      await expect(client.query('select * from timed_rank_models')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('reset role');
      client.release();
    }
    expect(boardKey([['Qu']])).toBe(boardKey([['QU']]));
  });

  it('ignores local calibration versions and refuses local-source publication', async () => {
    await h.db.insertInto('timed_rank_models').values({
      version: 'local-model', source_project_ref: 'local', through_date: '2026-01-01', cohorts: '{}',
    }).execute();
    await h.db.insertInto('timed_rank_models').values({
      version: 'timed-ranks-v1-wordfreq-3.1.1:legacy', source_project_ref: PRODUCTION_PROJECT_REF,
      through_date: '2026-01-01', cohorts: '{}',
    }).execute();
    // A policy change must not silently retain the old policy's multipliers.
    expect(await latestModel(h.db, '2026-02-01')).toBeNull();
    await expect(publishModel(h.db, { version: 'local', throughDate: '2026-01-01', cohorts: {} }, 'local')).rejects.toThrow('production');
    await expect(refreshRankStatistics(null, {
      beforeDate: '2026-02-01', write: false, history: [], sourceProjectRef: 'local',
    })).rejects.toThrow('production');
  });
});
