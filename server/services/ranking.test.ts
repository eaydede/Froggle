import { describe, expect, it } from 'vitest';
import { assignCompetitionRanks } from './ranking.js';

// Characterization: locks the current standard-competition-rank behavior
// ("1, 1, 3" — equal scores share a rank, the next distinct score skips the
// gap) before this helper moves to models/. After the move these same
// assertions must hold against the relocated implementation, byte-for-byte.
describe('assignCompetitionRanks (characterization)', () => {
  const ranksOf = (scores: number[]) =>
    assignCompetitionRanks(
      scores.map((points) => ({ points })),
      (p) => p.points,
    ).map((r) => r.rank);

  it('returns empty for empty input', () => {
    expect(assignCompetitionRanks([], (x: number) => x)).toEqual([]);
  });

  it('ranks a strictly-descending field 1,2,3', () => {
    expect(ranksOf([30, 20, 10])).toEqual([1, 2, 3]);
  });

  it('shares a rank for a tie and skips the gap (1,1,3)', () => {
    expect(ranksOf([20, 20, 10])).toEqual([1, 1, 3]);
  });

  it('gives every player rank 1 when all scores are equal', () => {
    expect(ranksOf([15, 15, 15])).toEqual([1, 1, 1]);
  });

  it('handles a trailing tie (1,2,2)', () => {
    expect(ranksOf([30, 20, 20])).toEqual([1, 2, 2]);
  });

  it('handles multiple tie groups (1,1,3,3,5)', () => {
    expect(ranksOf([20, 20, 10, 10, 5])).toEqual([1, 1, 3, 3, 5]);
  });

  it('ranks a single player first', () => {
    expect(ranksOf([42])).toEqual([1]);
  });

  it('preserves the original items alongside their ranks', () => {
    const items = [{ id: 'a', points: 9 }, { id: 'b', points: 9 }];
    const out = assignCompetitionRanks(items, (p) => p.points);
    expect(out).toEqual([
      { item: { id: 'a', points: 9 }, rank: 1 },
      { item: { id: 'b', points: 9 }, rank: 1 },
    ]);
  });
});
