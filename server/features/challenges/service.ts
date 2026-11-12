import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import { assignCompetitionRanks } from 'models/ranking';
import { dictionary } from '../../gameplay/dictionary.js';
import type { Database } from '../../platform/database/types.js';
import { ApplicationError } from '../../platform/errors.js';
import { getDisplayNames } from '../profile/publicNames.js';
import * as repository from './repository.js';

export async function shareResult(db: Kysely<Database>, userId: string, sessionId: string) {
  const row = await repository.findShareableSession(db, sessionId);

  if (!row) throw new ApplicationError('not-found', 'Session not found');
  if (row.user_id !== userId) {
    throw new ApplicationError('forbidden', 'Cannot share another player\'s session');
  }
  // Sharing a still-in-progress session would surface a challenge link
  // that points at an incomplete row — the share endpoint stays gated
  // on finalization so recipients always land on a finished baseline.
  if (!row.completed_at) {
    throw new ApplicationError('conflict', 'Session not finished');
  }

  if (row.challenge_id) {
    return { challengeId: row.challenge_id };
  }

  await repository.markShared(db, row);

  return { challengeId: row.id };

}

export async function getParticipation(db: Kysely<Database>, userId: string, challengeId: string) {
  const row = await repository.findParticipation(db, challengeId, userId);
  return { played: !!row, sessionId: row?.id ?? null };

}

export async function getChallengePreview(db: Kysely<Database>, userId: string, challengeId: string) {
  const rows = await repository.listPreviewSessions(db, challengeId);

  if (rows.length === 0) {
    throw new ApplicationError('not-found', 'Challenge not found');
  }

  const ownerRow = rows.find((r) => r.id === challengeId) ?? rows[0];
  const ownerName = ownerRow.user_id
    ? (await getDisplayNames([ownerRow.user_id])).get(ownerRow.user_id) ?? 'Anonymous'
    : 'Anonymous';

  const alreadyPlayed = rows.some((r) => r.user_id === userId);

  // No caching — `alreadyPlayed` and `playerCount` need to flip
  // immediately after the caller finishes the challenge so the confirm
  // page redirects them on the next visit instead of serving a stale
  // "not played yet" response.
  return {
    challengeId,
    ownerUserId: ownerRow.user_id,
    ownerDisplayName: ownerName,
    playerCount: rows.length,
    alreadyPlayed,
    config: {
      boardSize: ownerRow.board_size,
      minWordLength: ownerRow.min_word_length,
      timeLimit: ownerRow.time_limit,
    },
    seed: ownerRow.seed,
  };

}

export async function getChallenge(db: Kysely<Database>, userId: string, challengeId: string) {
  const rawRows = await repository.listChallengeSessions(db, challengeId);
  // Narrow completed_at to non-null for the downstream toISOString /
  // localeCompare calls. The WHERE clause is the runtime guarantee.
  const rows = rawRows.filter(
    (r): r is typeof r & { completed_at: Date; } => r.completed_at !== null,
  );

  if (rows.length === 0) {
    throw new ApplicationError('not-found', 'Challenge not found');
  }

  const meRow = rows.find((r) => r.user_id === userId);
  if (!meRow) {
    throw new ApplicationError('forbidden', 'You have not played this challenge');
  }

  // The originator's row carries challenge_id === its own id, so it
  // doubles as the challenge's authoritative config + board.
  const ownerRow = rows.find((r) => r.id === challengeId) ?? rows[0];
  const board: string[][] = typeof ownerRow.board === 'string'
    ? JSON.parse(ownerRow.board)
    : ownerRow.board;

  // Caller-specific missed list: every valid word on the board the
  // caller didn't find, so the "All words" toggle on the results page
  // can show what was on the table.
  const myWords: string[] = typeof meRow.found_words === 'string'
    ? JSON.parse(meRow.found_words)
    : meRow.found_words;
  const myFoundSet = new Set(myWords.map((w) => w.toUpperCase()));
  const allWords = findAllWords(board, dictionary, ownerRow.min_word_length);
  const missedWords = allWords
    .filter((w) => !myFoundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  const userIds = rows.map((r) => r.user_id).filter((id): id is string => !!id);
  const nameMap = await getDisplayNames(userIds);

  const players = rows.map((r) => {
    const words: string[] = typeof r.found_words === 'string'
      ? JSON.parse(r.found_words)
      : r.found_words;
    return {
      userId: r.user_id,
      displayName: r.user_id ? nameMap.get(r.user_id) ?? 'Anonymous' : 'Guest',
      sessionId: r.id,
      points: r.points,
      wordCount: r.word_count,
      longestWord: r.longest_word,
      completedAt: r.completed_at.toISOString(),
      foundWords: words.map((word) => ({ word, score: scoreWord(word) })),
      isOwner: r.id === challengeId,
      isYou: r.user_id === userId,
    };
  });

  // Display order is points desc, then word count, then earliest completion
  // — a stable order so the list doesn't jitter between requests. Rank,
  // though, is competition-ranked on points alone: equal points share a
  // place (1, 1, 3), and the secondary keys only decide who's listed first
  // within a tie, never the number shown next to them.
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wordCount !== a.wordCount) return b.wordCount - a.wordCount;
    return a.completedAt.localeCompare(b.completedAt);
  });
  const rankedPlayers = assignCompetitionRanks(players, (p) => p.points).map(
    ({ item, rank }) => ({ ...item, rank }),
  );

  // Drain the "new results" badge for the owner the moment they open
  // the challenge view. Fire-and-forget so a transient write failure
  // doesn't break the response — at worst the badge sticks around for
  // one more refresh.
  if (ownerRow.user_id === userId) {
    repository.markViewed(db, ownerRow)
      .catch((err) => {
        console.warn('Failed to update last_viewed_at:', (err as Error).message);
      });
  }


  return {
    challengeId,
    board,
    config: {
      boardSize: ownerRow.board_size,
      minWordLength: ownerRow.min_word_length,
      timeLimit: ownerRow.time_limit,
    },
    seed: ownerRow.seed,
    ownerUserId: ownerRow.user_id,
    players: rankedPlayers,
    missedWords,
  };

}