import type { Kysely } from 'kysely';
import type { BoardWordDifficultyAssessment } from 'models/results';
import type { Database } from '../../../platform/database/types.js';

function parseAssessment(value: unknown): BoardWordDifficultyAssessment {
  return (typeof value === 'string' ? JSON.parse(value) : value) as BoardWordDifficultyAssessment;
}

export async function findAssessment(db: Kysely<Database>, key: string) {
  const row = await db.selectFrom('zen_board_difficulties').select('assessment')
    .where('board_key', '=', key).executeTakeFirst();
  return row ? parseAssessment(row.assessment) : null;
}

export async function saveAssessment(db: Kysely<Database>, key: string, assessment: BoardWordDifficultyAssessment) {
  await db.insertInto('zen_board_difficulties').values({ board_key: key, assessment: JSON.stringify(assessment) })
    .onConflict(oc => oc.column('board_key').doNothing()).execute();
  return (await findAssessment(db, key))!;
}
