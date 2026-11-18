import { describe, expect, it } from 'vitest';
import { assertProductionSource, PRODUCTION_PROJECT_REF } from './production.js';

describe('production-only calibration history', () => {
  it('requires an explicit source and rejects local, staging, and lookalike hosts', () => {
    for (const source of [undefined, 'postgres://postgres@localhost:5432/postgres',
      'postgres://postgres@db.ohfqeivycvyudhekuamz.supabase.co/postgres',
      `postgres://postgres.${PRODUCTION_PROJECT_REF}@localhost/postgres`,
      `postgres://postgres@db.${PRODUCTION_PROJECT_REF}.supabase.co.example.org/postgres`,
    ]) expect(() => assertProductionSource(source)).toThrow();
  });
  it('accepts the production direct endpoint and production pooler usernames', () => {
    const direct = `postgres://reader@db.${PRODUCTION_PROJECT_REF}.supabase.co/postgres`;
    const pooled = `postgres://reader.${PRODUCTION_PROJECT_REF}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
    expect(assertProductionSource(direct)).toBe(direct);
    expect(assertProductionSource(pooled)).toBe(pooled);
  });
});
