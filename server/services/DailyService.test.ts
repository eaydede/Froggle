import { describe, expect, it } from 'vitest';
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';
import type { Database } from '../db/types.js';
import {
  buildStartDailyAttemptQuery,
  buildStartDailyAttemptRow,
} from './DailyService.js';

const PARAMS = {
  userId: 'user-1',
  date: '2026-05-12',
  board: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  config: { boardSize: 2, minWordLength: 3, timeLimit: 120 },
};

function dummyDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}

describe('buildStartDailyAttemptRow', () => {
  it('produces an empty result row with the player config', () => {
    expect(buildStartDailyAttemptRow(PARAMS)).toEqual({
      user_id: 'user-1',
      date: '2026-05-12',
      found_words: '[]',
      board: '[["A","B"],["C","D"]]',
      board_size: 2,
      min_word_length: 3,
      time_limit: 120,
    });
  });
});

describe('buildStartDailyAttemptQuery', () => {
  it('compiles to INSERT … ON CONFLICT DO NOTHING — never DO UPDATE — so a finalized row is never clobbered', () => {
    const compiled = buildStartDailyAttemptQuery(dummyDb(), PARAMS).compile();
    const sql = compiled.sql.toLowerCase();
    expect(sql).toContain('insert into "daily_results"');
    expect(sql).toContain('on conflict ("user_id", "date") do nothing');
    expect(sql).not.toContain('do update');
    expect(compiled.parameters).toEqual([
      'user-1',
      '2026-05-12',
      '[]',
      '[["A","B"],["C","D"]]',
      2,
      3,
      120,
    ]);
  });

  it('targets the same unique constraint as the finalize write so the two paths upsert against each other', () => {
    // Mirrors POST /api/daily/results's onConflict columns. If that route's
    // conflict target ever drifts, this test should drift with it.
    const compiled = buildStartDailyAttemptQuery(dummyDb(), PARAMS).compile();
    expect(compiled.sql.toLowerCase()).toContain('("user_id", "date")');
  });
});
