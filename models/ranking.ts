// Standard competition ranking ("1, 1, 3"): items with an equal score share a
// rank and the next distinct score skips the gap left by the tie. `sorted` must
// already be in non-increasing score order — rank is derived by comparing each
// item's score to the one before it.
//
// This lives in models/ — importable by both server and client — so the daily
// leaderboard, the free-play challenge standings, the zen leaderboard, the
// live multiplayer results, and the history-badge rank all agree on what a tie
// means. A tie is equal score, full stop; we deliberately do not break it by
// completion time or word count, so two players who see the same number also
// see the same place.
export function assignCompetitionRanks<T>(
  sorted: readonly T[],
  scoreOf: (item: T) => number,
): Array<{ item: T; rank: number }> {
  let prevScore: number | null = null;
  let prevRank = 0;
  return sorted.map((item, index) => {
    const score = scoreOf(item);
    const rank = prevScore !== null && score === prevScore ? prevRank : index + 1;
    prevScore = score;
    prevRank = rank;
    return { item, rank };
  });
}
