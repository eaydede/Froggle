import { sql, type Kysely } from 'kysely';
import type { TimedRankTargets } from 'models/timedRanks';
import type { GauntletModifier } from 'models/gauntlet';
import type { Database } from '../../platform/database/types.js';
import type { HistoricalGame, PublishedRankModel, RankModel } from './types.js';
import { PRODUCTION_PROJECT_REF } from './production.js';
import { getDailyZenConfig } from '../zen/config.js';
import { MODEL_VERSION } from './calculation.js';

function parseJson<T>(value: unknown): T {
  return typeof value === 'string' ? JSON.parse(value) as T : value as T;
}

export async function listHistoricalGames(db: Kysely<Database>, beforeDate: string): Promise<HistoricalGame[]> {
  const { rows } = await sql<{
    id: string; date: string; board: unknown; found_words: unknown;
    mode: HistoricalGame['settings']['mode']; board_size: number; time_limit: number; min_word_length: number;
    modifier: unknown;
  }>`
    select 'timed:' || id as id, date::text, board, found_words, 'timed' as mode,
      board_size, time_limit, min_word_length, null::jsonb as modifier
      from daily_results where ended_at is not null and date::date < ${beforeDate}::date
    union all
    select 'money:' || id, date::text, board, found_words, 'money',
      board_size, time_limit, min_word_length, null::jsonb
      from daily_time_is_money_results where ended_at is not null and date::date < ${beforeDate}::date
    union all
    select 'gauntlet:' || id, date::text, board, found_words, 'gauntlet-' || round_kind,
      board_size, time_limit, min_word_length, modifier
      from daily_gauntlet_results where ended_at is not null and date::date < ${beforeDate}::date
    union all
    select 'freeplay:' || id, date::text, board, found_words, 'freeplay',
      board_size, time_limit, min_word_length, null::jsonb
      from free_play_sessions where completed_at is not null and time_limit > 0 and date::date < ${beforeDate}::date
    union all
    select 'zen:' || id, date::text, board, found_words, 'zen',
      jsonb_array_length(board), 0, null::integer, null::jsonb
      from daily_zen_results where ended_at is not null and date::date < ${beforeDate}::date
    order by date, id
  `.execute(db);
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    board: parseJson<string[][]>(row.board),
    foundWords: parseJson<string[]>(row.found_words),
    settings: { mode: row.mode, boardSize: row.board_size, timeLimit: row.time_limit, minWordLength: row.mode === 'zen' ? getDailyZenConfig(row.date).minWordLength : row.min_word_length },
    modifier: row.modifier == null ? undefined : parseJson<GauntletModifier>(row.modifier),
  }));
}

export async function latestModel(db: Kysely<Database>, beforeDate: string): Promise<PublishedRankModel | null> {
  const row = await db.selectFrom('timed_rank_models').select(['version', 'cohorts', sql<string>`through_date::text`.as('through_date')])
    .where('through_date', '<', beforeDate)
    .where('source_project_ref', '=', PRODUCTION_PROJECT_REF)
    .where('version', 'like', `${MODEL_VERSION}:%`)
    .orderBy('through_date', 'desc').orderBy('published_at', 'desc').orderBy('version', 'desc').executeTakeFirst();
  if (!row) return null;
  const cohorts = parseJson<PublishedRankModel['cohorts']>(row.cohorts);
  return { version: row.version, throughDate: row.through_date, cohorts };
}

export async function findModel(db: Kysely<Database>, version: string): Promise<PublishedRankModel | null> {
  const row = await db.selectFrom('timed_rank_models').select(['version', 'cohorts', sql<string>`through_date::text`.as('through_date')])
    .where('version', '=', version).where('source_project_ref', '=', PRODUCTION_PROJECT_REF).executeTakeFirst();
  return row ? { version: row.version, throughDate: row.through_date, cohorts: parseJson(row.cohorts) } : null;
}

export async function cohortWords(db: Kysely<Database>, version: string, key: string) {
  return db.selectFrom('timed_word_statistics').select(['word', 'opportunities', 'finds', 'boards'])
    .where('version', '=', version).where('settings_key', '=', key).execute();
}

export async function publishModel(db: Kysely<Database>, model: RankModel, sourceProjectRef: string): Promise<void> {
  if (sourceProjectRef !== PRODUCTION_PROJECT_REF) throw new Error('Only production-sourced calibration models can be published');
  await db.transaction().execute(async trx => {
    // A transaction-scoped lock serializes manual and scheduled refreshes.
    await sql`select pg_advisory_xact_lock(703211601)`.execute(trx);
    const cohorts = Object.fromEntries(Object.entries(model.cohorts).map(([key, { words: _words, ...cohort }]) => [key, cohort]));
    const inserted = await trx.insertInto('timed_rank_models').values({
      version: model.version, source_project_ref: sourceProjectRef, through_date: model.throughDate, cohorts: JSON.stringify(cohorts),
    }).onConflict(oc => oc.column('version').doNothing()).returning('version').executeTakeFirst();
    if (!inserted) {
      // Re-publishing an earlier identical snapshot must make it current again
      // if corrected source results have since returned to their earlier values.
      await trx.updateTable('timed_rank_models').set({ published_at: new Date() }).where('version', '=', model.version).execute();
      return;
    }
    for (const [key, cohort] of Object.entries(model.cohorts)) {
      for (let start = 0; start < cohort.words.length; start += 1000) {
        await trx.insertInto('timed_word_statistics').values(cohort.words.slice(start, start + 1000).map(word => ({
          version: model.version, settings_key: key, ...word,
        }))).execute();
      }
    }
  });
}

export async function findBoardTargets(db: Kysely<Database>, key: string) {
  const row = await db.selectFrom('timed_board_ranks').select('targets').where('board_key', '=', key).executeTakeFirst();
  return row ? { targets: parseJson<TimedRankTargets | null>(row.targets) } : null;
}

export async function saveBoardTargets(db: Kysely<Database>, key: string, targets: TimedRankTargets | null) {
  await db.insertInto('timed_board_ranks').values({ board_key: key, targets: targets ? JSON.stringify(targets) : null })
    .onConflict(oc => oc.column('board_key').doNothing()).execute();
  // Return the winner of concurrent first-starts, never the losing candidate.
  return (await findBoardTargets(db, key))!.targets;
}
