import { findAllWords } from 'engine/solver.js';
import { dictionary } from '../../gameplay/dictionary.js';
import { getSession as getZenSession } from '../zen/service.js';
import { getDailyZenConfig } from '../zen/config.js';
import { prepareZenBoardDifficulty } from '../zen/difficulty/service.js';
import { getWordDifficulties } from '../timed-ranks/service.js';
import { scoreWord } from 'engine/scoring.js';
import { timeSurvivedSeconds } from 'models/timeIsMoney';
import { scoreGauntletWord } from 'engine/gauntletScoring.js';
import type { Kysely } from 'kysely';
import type { ResultPlayer, ResultsInsights, ResultsSource, ResultsWordDifficulties } from 'models/results';
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
    return { players: result.players, ...(result.rankTargets ? { rankTargets: result.rankTargets } : {}) };
  }
  const result = await repository.loadResults(db, userId, source);
  if (!result) throw new ApplicationError('not-found', 'Complete this game before viewing results');
  const names = await getDisplayNames(result.flatMap((r) => (r.userId ? [r.userId] : [])));
  const players = result.map((r) => playerFromStored(r, userId, names, source.mode));
  const rankTargets = result.find(row => row.userId === userId)?.rankTargets;
  return { players, ...(rankTargets ? { rankTargets } : {}) };
}

export async function getBoardWordDifficulties(
  db: Kysely<Database>,
  userId: string,
  source: ResultsSource,
): Promise<ResultsWordDifficulties> {
  let board;
  if (source.mode === 'zen') {
    const session = await getZenSession(db, userId, source.date);
    if (!session?.ended_at) throw new ApplicationError('not-found', 'Completed Zen result not found');
    const config = getDailyZenConfig(source.date);
    board = {
      board: session.board,
      words: session.found_words,
      targets: await prepareZenBoardDifficulty(db, session.board, source.date),
      settings: { mode: 'zen' as const, boardSize: session.board.length, minWordLength: config.minWordLength, timeLimit: 0 },
    };
  } else if (source.mode === 'room') {
    const result = getRoomResultsForUser(source.code, userId, source.playerId);
    if (!result) throw new ApplicationError('not-found', 'Completed room result not found');
    board = {
      board: result.board,
      targets: result.rankTargets,
      words: result.players.find(player => player.isYou)?.finds.map(find => find.word) ?? [],
      settings: {
        mode: 'freeplay' as const,
        boardSize: result.config.boardSize,
        timeLimit: result.config.durationSeconds,
        minWordLength: result.config.minWordLength,
      },
    };
  } else {
    board = await repository.loadDifficultyBoard(db, userId, source);
  }
  if (!board?.targets) throw new ApplicationError('not-found', 'Saved word difficulty data is unavailable for this game');
  const solved = findAllWords(board.board, dictionary, board.settings.minWordLength);
  const words = [...new Set([...solved.map(entry => entry.word), ...board.words].map(word => word.toUpperCase()))];
  const difficulties = await getWordDifficulties(db, words, board.settings, board.targets);
  if (!difficulties) throw new ApplicationError('not-found', 'Saved word difficulty statistics are unavailable');
  return { difficulties };
}
