import { describe, expect, it } from 'vitest';
import { aggregateFromRoundRanks, type RankedRow } from './DailyGauntletService.js';

function row(
  user: string,
  roundIndex: number,
  rank: number,
  completedAt: string,
  points = 0,
  wordCount = 0,
): RankedRow {
  return {
    user_id: user,
    date: '2026-05-21',
    round_index: roundIndex,
    points,
    word_count: wordCount,
    rank,
    completed_at: new Date(completedAt),
  };
}

describe('aggregateFromRoundRanks', () => {
  it('drops players who have not finalized every round', () => {
    const ranked: RankedRow[] = [
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 2, '2026-05-21T12:05:00Z'),
      // 'a' missing round 2
      row('b', 0, 2, '2026-05-21T12:00:00Z'),
      row('b', 1, 3, '2026-05-21T12:05:00Z'),
      row('b', 2, 1, '2026-05-21T12:10:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    expect(out.map((e) => e.userId)).toEqual(['b']);
  });

  it('lowest rank-sum wins, with round ranks ordered by round_index', () => {
    const ranked: RankedRow[] = [
      // 'a' submits in reverse order — output must still order ranks by round.
      row('a', 2, 3, '2026-05-21T12:10:00Z'),
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 2, '2026-05-21T12:05:00Z'),
      row('b', 0, 4, '2026-05-21T12:00:00Z'),
      row('b', 1, 4, '2026-05-21T12:05:00Z'),
      row('b', 2, 4, '2026-05-21T12:10:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    expect(out[0].userId).toBe('a');
    expect(out[0].roundRanks).toEqual([1, 2, 3]);
    expect(out[0].rankSum).toBe(6);
    expect(out[0].aggregateRank).toBe(1);
    expect(out[1].userId).toBe('b');
    expect(out[1].rankSum).toBe(12);
    expect(out[1].aggregateRank).toBe(2);
  });

  it('tiebreaks rank-sum ties on best single-round rank', () => {
    // Both 'a' and 'b' have rank-sum 6, but 'a' has a 1st-place round
    // while 'b' has no rank better than 2. Specialist wins.
    const ranked: RankedRow[] = [
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 2, '2026-05-21T12:05:00Z'),
      row('a', 2, 3, '2026-05-21T12:10:00Z'),
      row('b', 0, 2, '2026-05-21T12:00:00Z'),
      row('b', 1, 2, '2026-05-21T12:05:00Z'),
      row('b', 2, 2, '2026-05-21T12:10:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    expect(out.map((e) => e.userId)).toEqual(['a', 'b']);
    expect(out[0].aggregateRank).toBe(1);
    expect(out[1].aggregateRank).toBe(2);
  });

  it('tiebreaks identical rank-sum + best-single on earliest last-finish', () => {
    // 'a' and 'b' identical rank-sum (6) and best (2). 'a' finished round
    // 2 earlier, so it places first.
    const ranked: RankedRow[] = [
      row('a', 0, 2, '2026-05-21T12:00:00Z'),
      row('a', 1, 2, '2026-05-21T12:05:00Z'),
      row('a', 2, 2, '2026-05-21T12:10:00Z'),
      row('b', 0, 2, '2026-05-21T12:00:00Z'),
      row('b', 1, 2, '2026-05-21T12:05:00Z'),
      row('b', 2, 2, '2026-05-21T12:15:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    expect(out.map((e) => e.userId)).toEqual(['a', 'b']);
  });

  it('dense-ranks true ties (same rank-sum, best, and last-finish)', () => {
    // Identical on all three keys → dense rank assigns same number to
    // both; the next distinct player gets the next sequential rank.
    const ranked: RankedRow[] = [
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 1, '2026-05-21T12:05:00Z'),
      row('a', 2, 1, '2026-05-21T12:10:00Z'),
      row('b', 0, 1, '2026-05-21T12:00:00Z'),
      row('b', 1, 1, '2026-05-21T12:05:00Z'),
      row('b', 2, 1, '2026-05-21T12:10:00Z'),
      row('c', 0, 5, '2026-05-21T12:00:00Z'),
      row('c', 1, 5, '2026-05-21T12:05:00Z'),
      row('c', 2, 5, '2026-05-21T12:10:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    const byUser = new Map(out.map((e) => [e.userId, e.aggregateRank]));
    expect(byUser.get('a')).toBe(1);
    expect(byUser.get('b')).toBe(1);
    // Dense rank: the next distinct group takes index+1, not "rank after
    // skipping ties". For 'c' that's position 3 (zero-indexed 2 → +1).
    expect(byUser.get('c')).toBe(3);
  });

  it('lastFinishedAt is the latest completed_at across the three rounds', () => {
    // Submitting round 1 last (later than round 2) should still produce a
    // lastFinishedAt that reflects the latest timestamp.
    const ranked: RankedRow[] = [
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 1, '2026-05-21T12:30:00Z'),
      row('a', 2, 1, '2026-05-21T12:15:00Z'),
    ];
    const out = aggregateFromRoundRanks(ranked, 3);
    expect(out[0].lastFinishedAt.toISOString()).toBe('2026-05-21T12:30:00.000Z');
  });

  it('returns empty when no players have finalized all rounds', () => {
    const ranked: RankedRow[] = [
      row('a', 0, 1, '2026-05-21T12:00:00Z'),
      row('a', 1, 1, '2026-05-21T12:05:00Z'),
    ];
    expect(aggregateFromRoundRanks(ranked, 3)).toEqual([]);
  });
});
