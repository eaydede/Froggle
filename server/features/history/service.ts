import { scoreWord } from 'engine/scoring.js';
import { findAllWords } from 'engine/solver.js';
import type { Kysely } from 'kysely';
import { assignCompetitionRanks } from 'models/ranking';
import { getDailySeed } from 'models/seedCode';
import { dictionary } from '../../gameplay/dictionary.js';
import type { Database } from '../../platform/database/types.js';
import { ApplicationError } from '../../platform/errors.js';
import { computeChallengeNewResults } from '../free-play/service.js';
import { getDailyConfig } from '../timed-daily/config.js';
import * as repository from './repository.js';


interface HistoryEntry {
  sessionId: string;
  challengeId: string | null;
  date: string;
  completedAt: string;
  points: number;
  wordCount: number;
  longestWord: string;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  // True when the caller is the originator of this challenge (their
  // session row id equals its challenge_id). Drives the "Recent
  // challenges" grouping and the new-results badge — neither makes sense
  // on a challenge the user merely joined.
  isOwner: boolean;
  // Number of other participants who completed since the caller last
  // opened the challenge view. Zero for non-owned rows.
  newResults: number;
  // Total players in this challenge (always >= 1 — counts the caller
  // alone for non-shared sessions). Drives the row's single-tap target
  // on the history page: 1 → solo results, 2+ → standings/compare view.
  playerCount: number;
  // The caller's rank inside the challenge (1 = top score). Null for
  // solo sessions where rank isn't meaningful. The history page surfaces
  // a "1st" badge only when rank === 1.
  rank: number | null;
}


// True when a free_play_sessions row was actually a daily attempt that
// got recorded before the dedicated daily-skip flag. We match the row's
// seed and its full config against the canonical daily for that date —
// the conjunction is tight enough that a non-daily collision is
// effectively impossible (a 32-bit seed match plus identical config on
// the right calendar day).
function isDailyRow(row: {
  date: string;
  seed: number | null;
  board_size: number;
  time_limit: number;
  min_word_length: number;
}): boolean {
  if (row.seed == null) return false;
  const dailySeed = getDailySeed(row.date);
  if (row.seed !== dailySeed) return false;
  const dailyConfig = getDailyConfig(row.date);
  return (
    row.board_size === dailyConfig.boardSize &&
    row.time_limit === dailyConfig.timeLimit &&
    row.min_word_length === dailyConfig.minWordLength
  );
}
export async function getHistory(db: Kysely<Database>, userId: string) {
  const rawRows = await repository.listHistory(db, userId);

  // Older free-play rows include any daily attempts that flowed through
  // /api/game/start before the daily-skip flag landed. Filter them out
  // by matching seed + config against the canonical daily for the row's
  // date so the free-play history stays dedicated to free-play games.
  // completed_at is non-null by the WHERE filter above; narrow the type
  // so downstream consumers (toISOString, getTime) don't need guards.
  const rows = rawRows.filter(
    (r): r is typeof r & { completed_at: Date; } => !isDailyRow(r) && r.completed_at !== null,
  );

  // For every challenge the caller participated in (owned or joined),
  // pull every other participant once and reduce twice: a participant
  // count per challenge, and the new-results count for the rows the
  // caller owns. One query, two derived projections.
  const challengeIds = Array.from(
    new Set(rows.map((r) => r.challenge_id).filter((id): id is string => !!id)),
  );
  const playerCountByChallenge = new Map<string, number>();
  // Per-challenge rank lookup keyed by participant row id so we can
  // attach the caller's rank to each of their history entries.
  const rankByRowId = new Map<string, number>();
  let newResultsByChallenge = new Map<string, number>();
  if (challengeIds.length > 0) {
    const participants = await repository.listChallengeParticipants(db, challengeIds) as { id: string; challenge_id: string | null; completed_at: Date; points: number; word_count: number; }[];
    for (const p of participants) {
      const cid = p.challenge_id!;
      playerCountByChallenge.set(cid, (playerCountByChallenge.get(cid) ?? 0) + 1);
    }
    // Compute rank per challenge — competition-ranked on points so equal
    // points share a place (matches the challenge view's ranking exactly so
    // the badge and the standings agree). Word count and completion only
    // order the list within a tie; they no longer split the rank.
    const byChallenge = new Map<string, typeof participants>();
    for (const p of participants) {
      const list = byChallenge.get(p.challenge_id!) ?? [];
      list.push(p);
      byChallenge.set(p.challenge_id!, list);
    }
    for (const [, list] of byChallenge) {
      list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.word_count !== a.word_count) return b.word_count - a.word_count;
        return a.completed_at.getTime() - b.completed_at.getTime();
      });
      for (const { item, rank } of assignCompetitionRanks(list, (p) => p.points)) {
        rankByRowId.set(item.id, rank);
      }
    }
    newResultsByChallenge = computeChallengeNewResults(
      rows
        .filter((r) => r.challenge_id && r.id === r.challenge_id)
        .map((r) => ({
          id: r.id,
          completed_at: r.completed_at,
          last_viewed_at: r.last_viewed_at,
        })),
      participants.map((p) => ({
        id: p.id,
        challenge_id: p.challenge_id!,
        completed_at: p.completed_at,
      })),
    );
  }

  const entries: HistoryEntry[] = rows.map((r) => {
    const isOwner = !!r.challenge_id && r.id === r.challenge_id;
    const playerCount = r.challenge_id
      ? playerCountByChallenge.get(r.challenge_id) ?? 1
      : 1;
    return {
      sessionId: r.id,
      challengeId: r.challenge_id,
      date: r.date,
      completedAt: r.completed_at.toISOString(),
      points: r.points,
      wordCount: r.word_count,
      longestWord: r.longest_word,
      boardSize: r.board_size,
      timeLimit: r.time_limit,
      minWordLength: r.min_word_length,
      isOwner,
      newResults: isOwner ? (newResultsByChallenge.get(r.id) ?? 0) : 0,
      playerCount,
      rank: r.challenge_id ? rankByRowId.get(r.id) ?? null : null,
    };
  });


  return { entries };

}

export async function getUnread(db: Kysely<Database>, userId: string) {
  const ownedRows = await repository.listOwnedChallenges(db, userId) as { id: string; completed_at: Date; last_viewed_at: Date | null; }[];

  if (ownedRows.length === 0) {

    return { count: 0 };
  }

  const participants = await repository.listCompletedParticipants(db, ownedRows) as { id: string; challenge_id: string | null; completed_at: Date; }[];

  const counts = computeChallengeNewResults(
    ownedRows.map((r) => ({
      id: r.id,
      completed_at: r.completed_at,
      last_viewed_at: r.last_viewed_at,
    })),
    participants.map((p) => ({
      id: p.id,
      challenge_id: p.challenge_id!,
      completed_at: p.completed_at,
    })),
  );

  let total = 0;
  for (const n of counts.values()) total += n;


  return { count: total };

}

export async function getSavedResult(db: Kysely<Database>, userId: string, sessionId: string) {
  const row = await repository.findSavedSession(db, sessionId);

  if (!row) throw new ApplicationError('not-found', 'Session not found');
  if (row.user_id !== userId) {
    throw new ApplicationError('forbidden', 'Cannot view another player\'s session');
  }
  // Mid-game sessions don't have a results view yet — the player needs
  // to finish (or time out) before the saved-replay payload makes sense.
  if (!row.completed_at) {
    throw new ApplicationError('not-found', 'Session not finished');
  }
  const completedAt = row.completed_at;

  const board: string[][] = typeof row.board === 'string' ? JSON.parse(row.board) : row.board;
  const foundWords: string[] = typeof row.found_words === 'string'
    ? JSON.parse(row.found_words)
    : row.found_words;

  const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
  const all = findAllWords(board, dictionary, row.min_word_length);
  const found = all
    .filter((w) => foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);
  const missed = all
    .filter((w) => !foundSet.has(w.word))
    .map((w) => ({ word: w.word, path: w.path, score: scoreWord(w.word) }))
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length);


  return {
    sessionId: row.id,
    challengeId: row.challenge_id,
    seed: row.seed,
    completedAt: completedAt.toISOString(),
    board,
    foundWords: found,
    missedWords: missed,
    config: {
      boardSize: row.board_size,
      timeLimit: row.time_limit,
      minWordLength: row.min_word_length,
    },
  };

}