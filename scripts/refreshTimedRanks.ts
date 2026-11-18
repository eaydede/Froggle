import { readFile, writeFile } from 'node:fs/promises';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { getDb } from '../server/platform/database/index.js';
import type { Database } from '../server/platform/database/types.js';
import { getDailyDatePST } from '../server/features/timed-daily/config.js';
import { assertProductionSource, PRODUCTION_PROJECT_REF } from '../server/features/timed-ranks/production.js';
import { listHistoricalGames } from '../server/features/timed-ranks/repository.js';
import { refreshRankStatistics } from '../server/features/timed-ranks/service.js';
import type { HistoricalGame } from '../server/features/timed-ranks/types.js';

async function loadProductionHistory(path: string | undefined, beforeDate: string) {
  if (path) {
    const snapshot = JSON.parse(await readFile(path, 'utf8')) as {
      projectRef: string; beforeDate: string; exportedAt: string; games: HistoricalGame[];
    };
    if (snapshot.projectRef !== PRODUCTION_PROJECT_REF || !Array.isArray(snapshot.games)) {
      throw new Error('History export must identify froggle-prod and contain a games array');
    }
    if (!snapshot.beforeDate || beforeDate > snapshot.beforeDate) {
      throw new Error(`Export only covers history before ${snapshot.beforeDate}; set --before to that date or earlier`);
    }
    return { history: snapshot.games, source: { kind: 'production-export', projectRef: snapshot.projectRef, exportedAt: snapshot.exportedAt, beforeDate } };
  }
  const connectionString = assertProductionSource(process.env.RANKS_SOURCE_DATABASE_URL);
  const source = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({
    connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15_000,
    application_name: 'froggle-rank-calibration-readonly',
  }) }) });
  try {
    const history = await source.transaction().execute(async trx => {
      await sql`set transaction read only`.execute(trx);
      return listHistoricalGames(trx, beforeDate);
    });
    return { history, source: { kind: 'production-database', projectRef: PRODUCTION_PROJECT_REF, exportedAt: new Date().toISOString(), beforeDate } };
  } finally {
    await source.destroy();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const beforeDate = args.find(arg => arg.startsWith('--before='))?.slice('--before='.length) ?? getDailyDatePST();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate) || Number.isNaN(Date.parse(beforeDate))) throw new Error('Invalid --before=YYYY-MM-DD');
  const reportPath = args.find(arg => arg.startsWith('--report='))?.slice('--report='.length);
  const historyPath = args.find(arg => arg.startsWith('--history='))?.slice('--history='.length);
  const write = args.includes('--write');
  const recalibrate = args.includes('--recalibrate');
  if (write && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required as the publication destination for --write');
  const { history, source } = await loadProductionHistory(historyPath, beforeDate);
  const db = process.env.DATABASE_URL && (write || !recalibrate) ? getDb() : null;
  try {
    const report = { source, ...await refreshRankStatistics(db, { beforeDate, write, recalibrate, history, sourceProjectRef: PRODUCTION_PROJECT_REF }) };
    const json = JSON.stringify(report, null, 2);
    if (reportPath) await writeFile(reportPath, `${json}\n`);
    console.log(json);
    console.log(write ? 'Published production-sourced statistics; saved board targets are unchanged.' : 'Dry run: no database writes. Use --write to publish.');
  } finally {
    await db?.destroy();
  }
}

main().catch(error => { console.error('Timed rank refresh failed:', error); process.exitCode = 1; });
