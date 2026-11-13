import type { Kysely } from 'kysely';
import type { ResultsSource } from 'models/results';
import type { Database } from '../../platform/database/types.js';

const tables = {
  timed: 'daily_results',
  zen: 'daily_zen_results',
  money: 'daily_time_is_money_results',
  gauntlet: 'daily_gauntlet_results',
} as const;
export interface StoredResult {
  id: string;
  userId: string | null;
  words: string[];
  times: Record<string, number> | null;
  duration: number;
  timeLimit: number;
  modifier: import('models/gauntlet').GauntletModifier | null;
}
function json<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}
function translate(
  row: {
    id: string;
    user_id: string | null;
    found_words: unknown;
    word_times: unknown;
    started_at: Date;
    ended_at?: Date | null;
    completed_at?: Date | null;
    time_limit?: number;
    active_seconds?: number;
    modifier?: unknown;
  },
  sessionIds = false,
  capDuration = true,
): StoredResult {
  const elapsed = Math.max(
    0,
    ((row.ended_at ?? row.completed_at ?? row.started_at).getTime() - row.started_at.getTime()) /
      1000,
  );
  return {
    id: sessionIds ? row.id : row.user_id!,
    userId: row.user_id,
    words: json<string[]>(row.found_words),
    times: json<Record<string, number> | null>(row.word_times),
    duration:
      row.active_seconds ??
      (capDuration && row.time_limit && row.time_limit > 0
        ? Math.min(row.time_limit, elapsed)
        : elapsed),
    timeLimit: row.time_limit ?? 0,
    modifier: row.modifier ? json(row.modifier) : null,
  };
}

export async function loadResults(
  db: Kysely<Database>,
  userId: string,
  source: Exclude<ResultsSource, { mode: 'room' }>,
) {
  if (source.mode === 'freeplay') {
    const me = await db
      .selectFrom('free_play_sessions')
      .selectAll()
      .where('id', '=', source.sessionId)
      .where('user_id', '=', userId)
      .where('completed_at', 'is not', null)
      .executeTakeFirst();
    if (!me) return null;
    const field = me.challenge_id
      ? await db
          .selectFrom('free_play_sessions')
          .selectAll()
          .where('challenge_id', '=', me.challenge_id)
          .where('completed_at', 'is not', null)
          .execute()
      : [me];
    return field.map((r) => translate(r, true));
  }
  const table = tables[source.mode];
  let current = db
    .selectFrom(table)
    .selectAll()
    .where('date', '=', source.date)
    .where('ended_at', 'is not', null);
  if (source.mode === 'gauntlet') current = current.where('round_index', '=', source.round);
  const field = await current.execute();
  const me = field.find((r) => r.user_id === userId);
  if (!me) return null;
  return field.map((r) => translate(r, false, source.mode !== 'money'));
}
