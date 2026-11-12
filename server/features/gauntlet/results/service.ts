import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import {
  GAUNTLET_ROUND_COUNT,
  type GauntletModifier,
} from 'models/gauntlet';
import { dictionary } from '../../../gameplay/dictionary.js';
import type { Database } from '../../../platform/database/types.js';
import { ApplicationError } from '../../../platform/errors.js';
import { getDisplayNames } from '../../profile/publicNames.js';
import { getDailyGauntletNumber } from '../config.js';
import { aggregateFromRoundRanks, getGauntletRoundRanks, getGauntletRoundSession, scoreFoundWords } from '../service.js';
import * as repository from './repository.js';
export async function getRoundResult(db: Kysely<Database>, userId: string, date: string, roundIndex: number) {
  const session = await getGauntletRoundSession(
    db,
    userId,
    date,
    roundIndex,
  );
  if (!session || !session.endedAt) {

    return { result: null };
  }

  const foundSet = new Set(session.foundWords.map((w) => w.toUpperCase()));
  const missed = findAllWords(session.board, dictionary, session.config.minWordLength)
    .filter((w) => !foundSet.has(w.word));
  const scoredMissed = scoreFoundWords(
    missed.map((w) => w.word),
    session.modifier as GauntletModifier,
  );
  const missedWords = missed
    .map((w, i) => ({ word: w.word, path: w.path, score: scoredMissed[i].score }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);


  return {
    result: {
      date: session.date,
      roundIndex,
      roundKind: session.roundKind,
      modifier: session.modifier,
      config: session.config,
      board: session.board,
      found_words: session.foundWords,
      points: session.points,
      word_count: session.wordCount,
      longest_word: session.longestWord,
      missed_words: missedWords,
      completed_at: session.completedAt,
    },
  };

}

export async function getStandings(db: Kysely<Database>, userId: string, date: string) {
  const perRound = await getGauntletRoundRanks(db, date);
  const aggregate = aggregateFromRoundRanks(perRound, GAUNTLET_ROUND_COUNT);

  // Display names resolved in one pass against the union of users
  // appearing in either list. Cached helper so repeated calls within
  // the TTL hit memory.
  const userIds = new Set<string>();
  for (const r of perRound) userIds.add(r.user_id);
  for (const a of aggregate) userIds.add(a.userId);
  const names = await getDisplayNames(Array.from(userIds));


  return {
    date,
    puzzleNumber: getDailyGauntletNumber(date),
    currentUserId: userId,
    perRound: perRound.map((r) => ({
      userId: r.user_id,
      displayName: names.get(r.user_id) ?? 'Anonymous',
      roundIndex: r.round_index,
      points: r.points,
      wordCount: r.word_count,
      rank: r.rank,
    })),
    aggregate: aggregate.map((a) => ({
      userId: a.userId,
      displayName: names.get(a.userId) ?? 'Anonymous',
      roundRanks: a.roundRanks,
      rankSum: a.rankSum,
      aggregateRank: a.aggregateRank,
    })),
  };

}

export async function comparePlayers(db: Kysely<Database>, userId: string, date: string, roundIndex: number, otherUserId: string) {
  const rows = await repository.findComparisonSessions(db, date, roundIndex, userId, otherUserId);

  const mine = rows.find((r) => r.user_id === userId);
  const theirs = rows.find((r) => r.user_id === otherUserId);
  if (!mine || !mine.ended_at) {
    throw new ApplicationError('conflict', 'You have not played this round yet');
  }
  if (!theirs || !theirs.ended_at) {
    throw new ApplicationError('not-found', 'Opponent has not played this round');
  }

  const names = await getDisplayNames([userId, otherUserId]);
  const modifier = (typeof theirs.modifier === 'string'
    ? JSON.parse(theirs.modifier)
    : theirs.modifier) as GauntletModifier;
  const parseWords = (raw: unknown): string[] =>
    typeof raw === 'string' ? JSON.parse(raw) : (raw as string[]);
  const myWords = parseWords(mine.found_words);
  const theirWords = parseWords(theirs.found_words);
  const board = (typeof mine.board === 'string'
    ? JSON.parse(mine.board)
    : mine.board) as string[][];


  return {
    date,
    roundIndex,
    roundKind: theirs.round_kind,
    modifier,
    puzzleNumber: getDailyGauntletNumber(date),
    board,
    config: {
      boardSize: mine.board_size,
      minWordLength: mine.min_word_length,
      timeLimit: mine.time_limit,
    },
    me: {
      userId: userId,
      displayName: names.get(userId) ?? 'Anonymous',
      points: mine.points,
      wordCount: mine.word_count,
      foundWords: scoreFoundWords(myWords, modifier),
    },
    them: {
      userId: otherUserId,
      displayName: names.get(otherUserId) ?? 'Anonymous',
      points: theirs.points,
      wordCount: theirs.word_count,
      foundWords: scoreFoundWords(theirWords, modifier),
    },
  };

}
