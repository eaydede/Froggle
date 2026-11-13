import { scoreWord } from 'engine/scoring.js';
import { timeSurvivedSeconds } from 'models/timeIsMoney';
import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import type { Kysely } from 'kysely';
import type { ResultPlayer, ResultsInsights, ResultsSource } from 'models/results';
import type { Database } from '../../platform/database/types.js';
import { ApplicationError } from '../../platform/errors.js';
import { getDisplayNames } from '../profile/publicNames.js';
import { awaitBoardPersistence } from '../rooms/history.js';
import { getRoomResultsForUser } from '../rooms/service.js';
import * as repository from './repository.js';

function playerFromStored(
  row: repository.StoredResult,
  userId: string,
  names: Map<string, string>,
  mode: ResultsSource['mode'],
): ResultPlayer {
  return {
    id: row.id,
    displayName: names.get(row.userId ?? '') ?? 'Anonymous',
    isYou: row.userId === userId,
    duration: row.duration,
    timeLimit:
      mode === 'money'
        ? timeSurvivedSeconds(
            row.timeLimit,
            row.words.reduce((sum, word) => sum + scoreWord(word), 0),
          )
        : row.timeLimit,
    finds: row.words.map((word) => ({
      word: word.toUpperCase(),
      score: row.modifier ? scoreGauntletWord(word, row.modifier) : scoreWord(word),
      time: row.times?.[word] == null ? null : Math.max(0, Math.min(row.duration, row.times[word])),
    })),
  };
}

export async function getInsights(
  db: Kysely<Database>,
  userId: string,
  source: ResultsSource,
): Promise<ResultsInsights> {
  if (source.mode === 'room') {
    await awaitBoardPersistence(source.code);
    const result = getRoomResultsForUser(source.code, userId, source.playerId);
    if (!result) throw new ApplicationError('not-found', 'Completed room result not found');
    return { players: result.players };
  }
  const result = await repository.loadResults(db, userId, source);
  if (!result) throw new ApplicationError('not-found', 'Complete this game before viewing results');
  const names = await getDisplayNames(result.flatMap((r) => (r.userId ? [r.userId] : [])));
  const players = result.map((r) => playerFromStored(r, userId, names, source.mode));
  return { players };
}
