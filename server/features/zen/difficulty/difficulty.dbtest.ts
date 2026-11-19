import { randomUUID } from 'node:crypto';
import { generateSeededBoard } from 'engine/board.js';
import { findAllWords } from 'engine/solver.js';
import { scoreWord } from 'engine/scoring.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dockerAvailable, startTestDb, type TestDb } from '../../../test/pgHarness.js';
import { dictionary } from '../../../gameplay/dictionary.js';
import { getBoardWordDifficulties } from '../../results/service.js';
import { MODEL_VERSION } from '../../timed-ranks/calculation.js';
import { PRODUCTION_PROJECT_REF } from '../../timed-ranks/production.js';
import { publishModel } from '../../timed-ranks/repository.js';
import { listHistoricalGames } from '../../timed-ranks/repository.js';
import { settingsKey } from '../../timed-ranks/types.js';
import { getResult } from '../results/service.js';
import { startSession, endSession } from '../service.js';
import { prepareZenBoardDifficulty } from './service.js';

const settings = { mode: 'zen', boardSize: 5, timeLimit: 0, minWordLength: 4 } as const;
const date = '2026-11-12';
const board = generateSeededBoard(5, 100);

describe.runIf(dockerAvailable())('Zen result difficulty (DB)', () => {
  let h: TestDb;
  beforeAll(async () => { h = await startTestDb(); }, 180_000);
  afterAll(async () => { await h?.stop(); });
  beforeEach(async () => { await h.truncateAll(); });

  async function publishFixture() {
    const words = findAllWords(board, dictionary, 4).map(({ word }) => ({ word, opportunities: 40, finds: 10, boards: 5 }));
    await publishModel(h.db, {
      version: `${MODEL_VERSION}:zen-fixture`, throughDate: '2026-01-01',
      cohorts: { [settingsKey(settings)]: {
        settings, words, games: 40, boards: 5, multipliers: null, calibration: null,
        boardDifficulties: [0.2, 0.4, 0.6, 0.8, 0.9],
      } },
    }, PRODUCTION_PROJECT_REF);
  }

  it('shares and freezes difficulty across players without changing the Zen score ceiling', async () => {
    await publishFixture();
    const user = randomUUID();
    const session = await startSession(h.db, user, date, board, false);
    const maximum = findAllWords(board, dictionary, 4).reduce((sum, { word }) => sum + scoreWord(word), 0);
    expect(session.theoretical_max_score).toBe(maximum);
    const assessment = (await prepareZenBoardDifficulty(h.db, board, date))!;
    expect(assessment.boardDifficulty.totalPoints).toBe(maximum);
    expect(assessment.boardDifficulty.percentile).not.toBeNull();
    await publishModel(h.db, { version: `${MODEL_VERSION}:newer`, throughDate: '2026-02-01', cohorts: {} }, PRODUCTION_PROJECT_REF);
    await startSession(h.db, randomUUID(), date, board, true);
    expect(await prepareZenBoardDifficulty(h.db, board, date)).toEqual(assessment);
    expect(await h.db.selectFrom('zen_board_difficulties').selectAll().execute()).toHaveLength(1);

    await expect(getBoardWordDifficulties(h.db, user, { mode: 'zen', date })).rejects.toMatchObject({ code: 'not-found' });
    await endSession(h.db, user, date);
    const result = (await getResult(h.db, user, date)).result!;
    expect(result.theoretical_max_score).toBe(maximum);
    expect(result.difficulty_assessment).toEqual(assessment);
    const details = await getBoardWordDifficulties(h.db, user, { mode: 'zen', date });
    expect(Object.keys(details.difficulties).sort()).toEqual(findAllWords(board, dictionary, 4).map(({ word }) => word).sort());
    expect(Object.values(details.difficulties).every(value => value >= 0 && value <= 1)).toBe(true);
    await expect(getBoardWordDifficulties(h.db, randomUUID(), { mode: 'zen', date })).rejects.toMatchObject({ code: 'not-found' });
    const exported = await listHistoricalGames(h.db, '2026-11-13');
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ settings, board });
  });

  it('can assess a completed historical game and keeps statistics private', async () => {
    await publishFixture();
    const user = randomUUID();
    await h.db.insertInto('daily_zen_results').values({
      user_id: user, date, board: JSON.stringify(board), found_words: '[]', theoretical_max_score: null,
      ended_at: new Date('2026-11-12T12:01:00Z'),
    }).execute();
    const result = (await getResult(h.db, user, date)).result!;
    expect(result.difficulty_assessment?.boardDifficulty.comparisonBoards).toBe(5);
    expect(result.theoretical_max_score).toBeNull();
    const client = await h.pool.connect();
    try {
      await client.query('set role authenticated');
      await expect(client.query('select * from zen_board_difficulties')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('reset role');
      client.release();
    }
  });
});
