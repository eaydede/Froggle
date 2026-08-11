import { describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import { persistRoomBoardResults } from './FreePlayService.js';
import type { Database } from '../db/types.js';
import type { RoomBoardCompletion } from '../multiplayer/store.js';

// persistRoomBoardResults writes one free_play_sessions row per authenticated
// participant. The behaviour under test is the linkage: a multiplayer board
// must stamp every participant's row with one shared challenge_id (so each
// player's history surfaces the others), and that challenge_id must be the
// host's own row id — the self-referential originator model the rest of the
// system keys owner/attribution off. A solo board stays unlinked like an
// ordinary solo free-play session.

type InsertedRow = {
  id: string;
  user_id: string;
  challenge_id: string | null;
  points: number;
};

// Minimal Kysely stand-in: captures the rows handed to .values(...). Only the
// insertInto → values → execute chain persistRoomBoardResults uses is modelled.
function fakeDb(): { db: Kysely<Database>; inserted: () => InsertedRow[] } {
  let captured: InsertedRow[] = [];
  const db = {
    insertInto: () => ({
      values: (rows: InsertedRow[]) => {
        captured = rows;
        return { execute: async () => {} };
      },
    }),
  } as unknown as Kysely<Database>;
  return { db, inserted: () => captured };
}

function completion(
  userIds: string[],
  hostUserId: string | null = userIds[0] ?? null,
): RoomBoardCompletion {
  return {
    seed: 42,
    board: [['A', 'B'], ['C', 'D']],
    config: { durationSeconds: 60, boardSize: 2, minWordLength: 3 },
    startedAt: 1_000,
    endedAt: 61_000,
    hostUserId,
    participants: userIds.map((userId) => ({
      userId,
      foundWords: ['CAB'],
      points: 1,
      wordCount: 1,
      longestWord: 'CAB',
    })),
  };
}

describe('persistRoomBoardResults', () => {
  it('links every participant of a multiplayer board under one shared challenge_id', async () => {
    const { db, inserted } = fakeDb();
    await persistRoomBoardResults(db, completion(['user-1', 'user-2', 'user-3'], 'user-2'));

    const rows = inserted();
    expect(rows).toHaveLength(3);
    const challengeIds = new Set(rows.map((r) => r.challenge_id));
    expect(challengeIds.size).toBe(1);
    const [shared] = challengeIds;
    expect(shared).not.toBeNull();
    // The challenge id is a real participant row's id — exactly one row is
    // self-referential (id === challenge_id), and it's the host's row.
    const ownerRows = rows.filter((r) => r.id === shared);
    expect(ownerRows).toHaveLength(1);
    expect(ownerRows[0].user_id).toBe('user-2');
  });

  it('falls back to the first participant as owner when the host was not authenticated', async () => {
    const { db, inserted } = fakeDb();
    await persistRoomBoardResults(db, completion(['user-1', 'user-2'], null));

    const rows = inserted();
    const [shared] = new Set(rows.map((r) => r.challenge_id));
    const owner = rows.find((r) => r.id === shared);
    expect(owner?.user_id).toBe('user-1');
  });

  it('collapses a duplicated signed-in player to one row per user (their best showing)', async () => {
    const { db, inserted } = fakeDb();
    // user-1 occupies two slots (two devices). The (user_id, challenge_id)
    // unique index would reject the batch if both rows kept the shared id.
    await persistRoomBoardResults(db, {
      seed: 42,
      board: [['A', 'B'], ['C', 'D']],
      config: { durationSeconds: 60, boardSize: 2, minWordLength: 3 },
      startedAt: 1_000,
      endedAt: 61_000,
      hostUserId: 'user-1',
      participants: [
        { userId: 'user-1', foundWords: ['CA'], points: 2, wordCount: 1, longestWord: 'CA' },
        { userId: 'user-1', foundWords: ['CAB', 'DAB'], points: 5, wordCount: 2, longestWord: 'CAB' },
        { userId: 'user-2', foundWords: ['DAB'], points: 3, wordCount: 1, longestWord: 'DAB' },
      ],
    });

    const rows = inserted();
    expect(rows).toHaveLength(2);
    const userOneRows = rows.filter((r) => r.user_id === 'user-1');
    expect(userOneRows).toHaveLength(1);
    expect(userOneRows[0].points).toBe(5); // best of the two slots kept
    // Still one linked challenge, owned by the host's surviving row.
    const [shared] = new Set(rows.map((r) => r.challenge_id));
    expect(shared).not.toBeNull();
    expect(rows.find((r) => r.id === shared)?.user_id).toBe('user-1');
  });

  it('leaves a solo board unlinked so it behaves like a solo free-play session', async () => {
    const { db, inserted } = fakeDb();
    await persistRoomBoardResults(db, completion(['user-1']));

    const rows = inserted();
    expect(rows).toHaveLength(1);
    expect(rows[0].challenge_id).toBeNull();
  });

  it('writes nothing when no participant could be authenticated', async () => {
    const { db, inserted } = fakeDb();
    await persistRoomBoardResults(db, completion([]));
    expect(inserted()).toHaveLength(0);
  });
});
