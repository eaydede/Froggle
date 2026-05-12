import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';

export interface DailySummary {
  date: string;
  timedDailyPlayers: number;
  zenDailyPlayers: number;
  zenDailyActiveSeconds: number;
  freePlayGames: number;
}

// Returns aggregate engagement counts for a single PST calendar date.
// Each table stores `date` as PST YYYY-MM-DD (see migrations), so the
// query is a simple equality match — no timezone math needed at read
// time. Counts vs. distinct-user counts: daily_results and
// daily_zen_results have a unique (user_id, date) constraint, so count(*)
// is already a per-player count for those.
export async function getDailySummary(
  db: Kysely<Database>,
  date: string,
): Promise<DailySummary> {
  const [timedRow, zenRow, freePlayRow] = await Promise.all([
    db
      .selectFrom('daily_results')
      .select((eb) => eb.fn.countAll<number>().as('players'))
      .where('date', '=', date)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('daily_zen_results')
      .select((eb) => [
        eb.fn.countAll<number>().as('players'),
        eb.fn.sum<number>('active_seconds').as('active_seconds'),
      ])
      .where('date', '=', date)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('free_play_sessions')
      .select((eb) => eb.fn.countAll<number>().as('games'))
      .where('date', '=', date)
      .executeTakeFirstOrThrow(),
  ]);

  return {
    date,
    timedDailyPlayers: Number(timedRow.players),
    zenDailyPlayers: Number(zenRow.players),
    zenDailyActiveSeconds: Number(zenRow.active_seconds ?? 0),
    freePlayGames: Number(freePlayRow.games),
  };
}

// Returns yesterday's PST calendar date, formatted YYYY-MM-DD. "Yesterday"
// is defined as the day before the *current* PST date — so a script running
// at 00:30 PST on 2026-05-12 reports on 2026-05-11.
export function getYesterdayPST(now: Date = new Date()): string {
  const todayPST = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  const d = new Date(todayPST + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function formatActiveDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
